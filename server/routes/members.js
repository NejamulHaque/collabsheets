const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'collabsheets_super_secret_key_2026';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// GET /documents/:id/members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM document_members WHERE document_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch { res.json([]); }
});

// POST /documents/:id/members — invite by email
router.post('/:id/members', auth, async (req, res) => {
  const { email, role = 'editor' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const r = await db.query(
      'INSERT INTO document_members (document_id, user_email, role) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, email, role]
    );
    try {
      const u = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (u.rows[0]) {
        await db.query(
          "INSERT INTO notifications (user_id, type, title, message, document_id) VALUES ($1, 'share', '📤 Document shared', $2, $3)",
          [u.rows[0].id, `You were invited as ${role} on a CollabSheet.`, req.params.id]
        );
      }
    } catch {}
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /documents/:id/members/:mid — remove member
router.delete('/:id/members/:mid', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM document_members WHERE id = $1 AND document_id = $2', [req.params.mid, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;