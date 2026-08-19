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