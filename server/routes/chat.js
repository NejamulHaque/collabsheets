const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/:docId/messages', auth, async (req, res) => {
  const result = await db.query(
    `SELECT m.id, m.content, m.created_at, u.username, u.id as user_id
     FROM chat_messages m JOIN users u ON m.user_id = u.id
     WHERE m.document_id = $1 ORDER BY m.created_at ASC LIMIT 100`,
    [req.params.docId]
  );
  res.json(result.rows);
});

router.post('/:docId/messages', auth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Empty message' });
  const result = await db.query(
    'INSERT INTO chat_messages (document_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at',
    [req.params.docId, req.user.id, content]
  );
  const userRes = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
  res.json({ ...result.rows[0], username: userRes.rows[0].username, user_id: req.user.id });
});

module.exports = router;