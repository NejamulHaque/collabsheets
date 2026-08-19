const express = require('express');
const router = express.Router();

// ✅ POST /ai/generate (matches your AIPanel.jsx call)
router.post('/generate', async (req, res) => {
  const { prompt, context } = req.body || {};
  
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    // Build the full prompt with context
    const fullPrompt = context 
      ? `Context (current document content):\n${context}\n\nUser question: ${prompt}`
      : prompt;

    // Call your Irus AI service
    const response = await fetch('https://irus-ai.onrender.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullPrompt,
        prompt: fullPrompt,
        query: fullPrompt,
        input: fullPrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Irus AI error');
    }

    // Extract answer from whatever format your AI returns
    const answer = data?.reply || data?.answer || data?.response || 
                   data?.message || data?.output || data?.result || 
                   data?.text || data?.content ||
                   (typeof data === 'string' ? data : JSON.stringify(data));

    // Return in the format your AIPanel expects
    res.json({ response: answer, answer, message: answer });

  } catch (err) {
    console.error('Irus AI error:', err.message);
    res.status(500).json({ 
      error: 'Irus AI service error',
      details: err.message 
    });
  }
});

module.exports = router;