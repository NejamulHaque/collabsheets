const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/:docId/versions', auth, async (req, res) => {
  const result = await db.query(
    `SELECT v.id, v.title, v.mode, v.created_at, u.username
     FROM document_versions v LEFT JOIN users u ON v.user_id = u.id
     WHERE v.document_id = $1 ORDER BY v.created_at DESC`,
    [req.params.docId]
  );
  res.json(result.rows);
});

router.post('/:docId/versions', auth, async (req, res) => {
  const docRes = await db.query('SELECT yjs_state, mode, content FROM documents WHERE id = $1', [req.params.docId]);
  if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
  const { yjs_state, mode, content } = docRes.rows[0];
  const result = await db.query(
    `INSERT INTO document_versions (document_id, user_id, title, mode, content, yjs_state)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, mode, created_at`,
    [req.params.docId, req.user.id, req.body.title || 'Manual snapshot', mode, content, yjs_state]
  );
  const userRes = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
  res.json({ ...result.rows[0], username: userRes.rows[0].username });
});

router.post('/:docId/versions/:vid/restore', auth, async (req, res) => {
  const vRes = await db.query('SELECT yjs_state, mode, content FROM document_versions WHERE id = $1 AND document_id = $2', [req.params.vid, req.params.docId]);
  if (vRes.rows.length === 0) return res.status(404).json({ error: 'Version not found' });
  const { yjs_state, mode, content } = vRes.rows[0];
  await db.query('UPDATE documents SET yjs_state = $1, mode = $2, content = $3, updated_at = NOW() WHERE id = $4', [yjs_state, mode, content, req.params.docId]);
  res.json({ ok: true, message: 'Version restored.' });
});

module.exports = router;