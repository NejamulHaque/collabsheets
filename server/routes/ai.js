const express = require('express');
const axios = require('axios');
const router = express.Router();

// AI endpoint proxy (handles CORS for frontend)
router.post('/ai/chat', async (req, res) => {
  const { message, apiKey } = req.body || {};
  
  if (!message) return res.status(400).json({ error: 'No message provided' });
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' });

  // Try multiple Irus AI endpoints
  const endpoints = [
    'https://irus-ai.onrender.com/api/chat',
    'https://irus-ai.onrender.com/chat',
    'https://irus-ai-api.onrender.com/api/chat'
  ];

  let lastErr = null;

  for (const url of endpoints) {
    try {
      const response = await axios.post(url,
        { 
          message, 
          query: message, 
          prompt: message, 
          input: message,
          text: message 
        },
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
      
      // Try to extract the answer from various response formats
      const data = response.data;
      const answer = data?.reply || data?.answer || data?.response || 
                    data?.message || data?.output || data?.result || 
                    data?.text || data?.content ||
                    (typeof data === 'string' ? data : JSON.stringify(data));
      
      return res.json({ 
        ok: true, 
        reply: answer,
        data: response.data,
        endpoint: url 
      });
    } catch (e) {
      lastErr = e;
      // 404 means wrong endpoint, try next one
      if (e.response?.status === 404) continue;
      // Other errors (401, 500, etc) stop trying
      break;
    }
  }

  // All endpoints failed
  res.status(lastErr?.response?.status || 502).json({
    ok: false,
    error: lastErr?.response?.data?.error || lastErr?.message || 'AI service unavailable',
    status: lastErr?.response?.status,
    message: lastErr?.response?.data?.message
  });
});

module.exports = router;