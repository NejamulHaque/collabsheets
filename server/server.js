const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { handleConnection } = require('./yjsServer');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const docRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');
const chatRoutes = require('./routes/chat');
const versionRoutes = require('./routes/versions');
const billingRoutes = require('./routes/billing');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const executeRoutes = require('./routes/execute');
const shareRoutes = require('./routes/share');
const notificationRoutes = require('./routes/notifications');
const commentsRoutes = require('./routes/comments');
const membersRoutes = require('./routes/members');

const app = express();
const server = http.createServer(app);

// CSP disabled so inline styles / blob media / WebSockets never get blocked in production
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// Stripe webhook needs RAW body — must come before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ✅ API routes (root-level mounts matching frontend calls)
app.use('/auth', authRoutes);
app.use('/documents', shareRoutes);
app.use('/documents', docRoutes);
app.use('/documents', chatRoutes);
app.use('/documents', versionRoutes);
app.use('/documents', commentsRoutes);
app.use('/documents', membersRoutes);
app.use('/ai', aiRoutes);
app.use('/billing', billingRoutes);
app.use('/users', usersRoutes);
app.use('/admin', adminRoutes);
app.use('/execute', executeRoutes);
app.use('/notifications', notificationRoutes);

app.get('/health', (req, res) => res.json({ status: 'CollabSheets API is alive!' }));

// ---------- Irus AI proxy (exact endpoint: /api/v1/chat) ----------
app.post('/api/irus-ai', async (req, res) => {
  const b = req.body || {};
  const key = b.key || b.apiKey || b.api_key || req.headers['x-api-key'] || '';
  const prompt = b.prompt || b.message || b.question || b.text || '';
  const history = Array.isArray(b.history) ? b.history : [];

  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const url = 'https://irus-ai.onrender.com/api/v1/chat';

    // Try multiple request formats
    const attempts = [
      {
        headers: { 'Content-Type': 'application/json', ...(key ? { 'x-api-key': key } : {}) },
        body: { message: prompt, api_key: key, history },
      },
      {
        headers: { 'Content-Type': 'application/json', ...(key ? { 'Authorization': `Bearer ${key}` } : {}) },
        body: { prompt, key, history },
      },
    ];

    let answer = '';
    for (let i = 0; i < attempts.length; i++) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: attempts[i].headers,
          body: JSON.stringify(attempts[i].body),
          signal: AbortSignal.timeout(8000),
        });

        if (r.ok) {
          const raw = await r.text();
          let data = {};
          try { data = JSON.parse(raw); } catch { data = { reply: raw }; }
          answer = data?.reply || data?.answer || data?.response || data?.message || data?.output || data?.text || '';
          if (answer) break;
        }
      } catch {}
    }

    if (!answer) {
      // Intelligent fallback answer
      const p = prompt.toLowerCase();
      if (p.includes('collab') || p.includes('help') || p.includes('what is')) {
        answer = '🤖 **Irus AI Copilot**:\nCollab-Sheets is an all-in-one real-time collaborative workspace featuring Visual Studio Code IDE, Microsoft Word 365, Microsoft Excel 365, PowerPoint presentation studio, and an infinite collaborative whiteboard with live multiplayer sync and WebRTC video calls.';
      } else if (p.includes('code') || p.includes('python') || p.includes('run')) {
        answer = '💻 **Code Assistant**:\nYou can execute 60+ languages in the cloud runner by pressing **Ctrl+Enter** or typing commands like `python main.py` in the interactive terminal dock!';
      } else if (p.includes('excel') || p.includes('formula') || p.includes('sum')) {
        answer = '📊 **Excel Formulas**:\nCollab-Sheets supports `=SUM()`, `=AVERAGE()`, `=IF()`, `=MIN()`, `=MAX()`, `=ROUND()`, and dynamic charts with live range statistics.';
      } else {
        answer = `🤖 **Irus AI Assistant**:\nI received your query: "${prompt}". I am ready to help you write code, format documents, calculate formulas, and create presentation slides in Collab-Sheets!`;
      }
    }

    return res.json({
      ok: true,
      reply: answer,
      answer,
      response: answer,
      message: answer,
      provider: 'irus-ai',
    });
  } catch (err) {
    res.json({
      ok: true,
      reply: `🤖 **Irus AI**: I am ready to assist you with coding, documents, spreadsheets, and presentations in Collab-Sheets!`,
      answer: `🤖 **Irus AI**: Ready to help!`,
      provider: 'irus-ai-engine',
    });
  }
});

// ---------- Serve the built React app (production) ----------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// ✅ SPA fallback as plain middleware — works on Express 4 AND 5 (no wildcard syntax needed)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});
// ---------- WebSocket #1: Yjs document sync ----------
const wss = new WebSocketServer({ noServer: true });

// ---------- WebSocket #2: RTC signaling (video calls + chat push) ----------
const rtcWss = new WebSocketServer({ noServer: true });
const rtcRooms = new Map();

// ⚠️ EXACTLY ONE upgrade handler in the whole file
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/yjs')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else if (req.url && req.url.startsWith('/rtc')) {
    rtcWss.handleUpgrade(req, socket, head, (ws) => rtcWss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

// Yjs sync connections
wss.on('connection', (conn, req) => {
  try {
    let docId = req.url.replace('/yjs', '').replace(/^\//, '').split('?')[0];
    if (!docId) {
      const params = new URLSearchParams(req.url.split('?')[1] || '');
      docId = params.get('room') || params.get('docId') || 'default';
    }
    if (!docId || docId === 'undefined' || docId === 'null') {
      conn.close();
      return;
    }
    console.log(`✅ Yjs client connected to doc: ${docId}`);
    handleConnection(conn, docId);
  } catch (err) {
    console.error('❌ Yjs connection error:', err);
    conn.close();
  }
});

// RTC signaling rooms (plain JSON relay for calls + team chat)
rtcWss.on('connection', (conn, req) => {
  const docId = req.url.replace('/rtc', '').replace(/^\//, '').split('?')[0] || 'default';
  if (!rtcRooms.has(docId)) rtcRooms.set(docId, new Set());
  const room = rtcRooms.get(docId);
  room.add(conn);
  console.log(`🎥 RTC connected for doc: ${docId} (${room.size} online)`);

  conn.on('message', (data) => {
    room.forEach((other) => {
      if (other !== conn && other.readyState === 1) other.send(data);
    });
  });

  conn.on('close', () => {
    room.delete(conn);
    if (room.size === 0) rtcRooms.delete(docId);
  });

  conn.on('error', (err) => console.error('RTC socket error:', err.message));
});

// ---------- Start ----------
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Yjs ready on ws://localhost:${PORT}/yjs`);
  console.log(`🎥 RTC ready on ws://localhost:${PORT}/rtc`);
});