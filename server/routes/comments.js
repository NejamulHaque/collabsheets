const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { notify } = require('../utils/notify');
const router = express.Router();
router.get('/:docId/comments', auth, async (req, res) => {
  const r = await db.query(`SELECT c.*, u.username FROM doc_comments c JOIN users u ON u.id=c.user_id WHERE c.document_id=$1 ORDER BY c.created_at DESC`, [req.params.docId]);
  res.json(r.rows);
});
router.post('/:docId/comments', auth, async (req, res) => {
  const { quote, line, text } = req.body;
  const r = await db.query('INSERT INTO doc_comments (document_id, user_id, quote, line, text) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.params.docId, req.user.id, quote || '', line || null, text]);
  const owner = await db.query('SELECT owner_id FROM documents WHERE id=$1', [req.params.docId]);
  if (owner.rows[0] && owner.rows[0].owner_id !== req.user.id) notify(owner.rows[0].owner_id, `💬 New comment: "${text}"`, 'comment');
  res.json(r.rows[0]);
});
router.post('/resolve/:id', auth, async (req, res) => {
  await db.query('UPDATE doc_comments SET resolved=TRUE WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
module.exports = router;