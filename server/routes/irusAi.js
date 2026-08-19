const express = require('express');
const axios = require('axios');
const router = express.Router();

// ⚙️ Configure to match your real Irus AI endpoint
const IRUS_BASE = process.env.IRUS_AI_URL || 'https://irus-ai.onrender.com';

router.post('/api/irus-ai', async (req, res) => {
  const { message, apiKey } = req.body || {};
  if (!message) return res.status(400).json({ error: 'No message provided' });
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' });

  const endpoints = ['/api/chat', '/chat', '/']; // try common paths
  let lastErr = null;

  for (const path of endpoints) {
    try {
      const r = await axios.post(`${IRUS_BASE}${path}`,
        { message, query: message, prompt: message, input: message },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'api-key': apiKey,
          },
          timeout: 30000,
        }
      );
      return res.json({ ok: true, data: r.data, status: r.status, path });
    } catch (e) {
      lastErr = e;
      // 404 → try next endpoint; other errors → stop
      if (e.response?.status !== 404) break;
    }
  }

  res.status(lastErr?.response?.status || 502).json({
    ok: false,
    error: lastErr?.response?.data?.error || lastErr?.message || 'Irus AI unreachable',
    status: lastErr?.response?.status,
  });
});

module.exports = router;