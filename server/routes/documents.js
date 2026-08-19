const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'collabsheets_super_secret_key_2026';

// ✅ Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  try { 
    req.user = jwt.verify(token, JWT_SECRET); 
    next(); 
  } catch { 
    res.status(401).json({ error: 'Invalid token' }); 
  }
};

// 1️⃣ Resolve Share Token
router.get('/share/resolve/:token', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT id, share_level FROM documents WHERE share_token = $1', [req.params.token]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Link not found or expired' });
    const doc = r.rows[0];
    if (!doc.share_level || doc.share_level === 'private') return res.status(403).json({ error: 'This document is private' });
    res.json({ id: doc.id, role: doc.share_level === 'edit' ? 'editor' : 'viewer' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2️⃣ Get User's Documents (Dashboard)
router.get('/', auth, async (req, res) => {
  try {
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const userEmail = userRes.rows[0]?.email;

    // owner_id is VARCHAR(255), req.user.id is UUID string
    const owned = await db.query(
      "SELECT *, 'owner' as role FROM documents WHERE owner_id = $1", 
      [req.user.id]
    );

    let shared = { rows: [] };
    if (userEmail) {
      shared = await db.query(
        `SELECT d.*, m.role FROM documents d 
         JOIN document_members m ON d.id = m.document_id 
         WHERE LOWER(m.user_email) = LOWER($1)`,
        [userEmail]
      );
    }

    const allDocs = [...owned.rows, ...shared.rows].sort((a, b) => 
      new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    );

    res.json(allDocs);
  } catch (e) { 
    console.error('❌ Dashboard fetch error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// 3️⃣ Get Single Document
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    const doc = r.rows[0];
    
    let role = null;
    if (String(userId) === String(doc.owner_id)) {
      role = 'owner';
    } else {
      const u = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (u.rows[0]) {
        const m = await db.query('SELECT role FROM document_members WHERE document_id = $1 AND LOWER(user_email) = LOWER($2)', [req.params.id, u.rows[0].email]);
        if (m.rows[0]) role = m.rows[0].role === 'viewer' ? 'viewer' : 'editor';
      }
    }

    if (!role) {
      if (doc.share_level === 'edit') role = 'editor';
      else if (doc.share_level === 'view') role = 'viewer';
      else return res.status(403).json({ error: 'You do not have access to this document' });
    }
    
    res.json({ ...doc, role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4️⃣ Create Document
router.post('/', auth, async (req, res) => {
  const { title, mode } = req.body;
  try {
    const r = await db.query('INSERT INTO documents (title, mode, owner_id) VALUES ($1, $2, $3) RETURNING *', [title || 'Untitled', mode || 'code', req.user.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5️⃣ Update Document (Includes Share Settings)
router.patch('/:id', auth, async (req, res) => {
  const { title, mode, share_level, share_token } = req.body;
  try {
    const r = await db.query(
      `UPDATE documents SET 
        title = COALESCE($1, title), 
        mode = COALESCE($2, mode), 
        share_level = COALESCE($3, share_level),
        share_token = COALESCE($4, share_token),
        updated_at = NOW() 
       WHERE id = $5 RETURNING *`, 
      [title, mode, share_level, share_token, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6️⃣ Delete Document
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7️⃣ Get Chat Messages (✅ FIXED: Cast UUID to text for JOIN)
router.get('/:id/messages', auth, async (req, res) => {
  try { 
    const msgs = await db.query(
      `SELECT m.*, u.username FROM messages m 
       LEFT JOIN users u ON m.user_id = u.id::text 
       WHERE m.document_id = $1 ORDER BY m.created_at ASC`, 
      [req.params.id]
    );
    res.json(msgs.rows); 
  } catch (e) {
    console.error('Chat fetch error:', e.message);
    res.json([]); 
  }
});

// 8️⃣ Post Chat Message
router.post('/:id/messages', auth, async (req, res) => {
  const userId = req.user.id;
  try { 
    const r = await db.query('INSERT INTO messages (document_id, user_id, text) VALUES ($1,$2,$3) RETURNING *', [req.params.id, userId, req.body.text]); 
    const u = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    res.json({ ...r.rows[0], username: u.rows[0]?.username || 'User' }); 
  } catch (e) { 
    console.error('Chat post error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// 9️⃣ Get Version History (✅ FIXED: Table name is document_versions)
router.get('/:id/versions', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM document_versions WHERE document_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch (e) {
    console.error('Version fetch error:', e.message);
    res.json([]); 
  }
});

// 🔟 Create Version Snapshot (✅ FIXED: Table name is document_versions)
router.post('/:id/versions', auth, async (req, res) => {
  const { title } = req.body;
  try {
    const r = await db.query('INSERT INTO document_versions (document_id, title, user_id) VALUES ($1, $2, $3) RETURNING *', [req.params.id, title || 'Manual snapshot', req.user.id]);
    res.json(r.rows[0]);
  } catch (e) { 
    console.error('Version create error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;