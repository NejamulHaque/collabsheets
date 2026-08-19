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

const adminOnly = async (req, res, next) => {
  try {
    const u = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!u.rows[0]?.is_admin) return res.status(403).json({ error: 'Admins only' });
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const count = async (sql) => { try { return (await db.query(sql)).rows[0]?.c ?? 0; } catch { return 0; } };

// GET /admin/stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  let signups = [], pays = [];
  try {
    const r = await db.query(`
      SELECT to_char(d, 'DY') AS label,
        (SELECT COUNT(*)::int FROM users WHERE DATE(created_at) = DATE(d)) AS value
      FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') d`);
    signups = r.rows;
  } catch {}
  try {
    const r = await db.query(`
      SELECT to_char(d, 'DY') AS label,
        (SELECT COUNT(*)::int FROM payments WHERE DATE(created_at) = DATE(d) AND status = 'approved') AS value
      FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') d`);
    pays = r.rows;
  } catch {}

  res.json({
    users: await count('SELECT COUNT(*)::int AS c FROM users'),
    pros: await count("SELECT COUNT(*)::int AS c FROM users WHERE tier = 'pro'"),
    pending: await count("SELECT COUNT(*)::int AS c FROM payments WHERE status = 'pending'"),
    revenue: await count("SELECT COALESCE(SUM(amount),0)::int AS c FROM payments WHERE status = 'approved'"),
    docs: await count('SELECT COUNT(*)::int AS c FROM documents'),
    runs: 0, // stub for now
    ai: 0,   // stub for now
    signups,
    pays,
  });
});

// GET /admin/payments
router.get('/payments', auth, adminOnly, async (req, res) => {
  try {
    const r = await db.query('SELECT p.*, u.username, u.email FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC');
    res.json(r.rows);
  } catch { res.json([]); }
});

// PATCH /admin/payments/:id — approve / reject
router.patch('/payments/:id', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  try {
    const p = await db.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (!p.rows[0]) return res.status(404).json({ error: 'Payment not found' });
    await db.query('UPDATE payments SET status = $1 WHERE id = $2', [status, req.params.id]);
    if (status === 'approved') await db.query("UPDATE users SET tier = 'pro' WHERE id = $1", [p.rows[0].user_id]);
    try {
      await db.query('INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)', [
        p.rows[0].user_id, 'payment',
        status === 'approved' ? '🎉 Pro activated!' : 'Payment update',
        status === 'approved' ? 'Your UPI payment was verified. Enjoy CollabSheets Pro!' : 'Your payment could not be verified.',
      ]);
    } catch {}
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/users
router.get('/users', auth, adminOnly, async (req, res) => {
  try { res.json((await db.query('SELECT id, username, email, tier, is_admin, created_at FROM users ORDER BY created_at DESC')).rows); }
  catch { res.json([]); }
});

// PATCH /admin/users/:id — update tier
router.patch('/users/:id', auth, adminOnly, async (req, res) => {
  const { tier } = req.body;
  try {
    await db.query('UPDATE users SET tier = $1 WHERE id = $2', [tier, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /admin/users/:id/toggle-admin
router.patch('/users/:id/toggle-admin', auth, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE users SET is_admin = NOT is_admin WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /admin/users/:id
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/documents
router.get('/documents', auth, adminOnly, async (req, res) => {
  try { res.json((await db.query('SELECT d.*, u.username AS owner FROM documents d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.updated_at DESC')).rows); }
  catch { res.json([]); }
});

// DELETE /admin/documents/:id
router.delete('/documents/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/activity
router.get('/activity', auth, adminOnly, async (req, res) => {
  const acts = [];
  try { (await db.query('SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 5')).rows.forEach(r => acts.push({ type: 'signup', title: `${r.username} joined`, time: r.created_at })); } catch {}
  try { (await db.query('SELECT p.status, p.created_at, u.username FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 5')).rows.forEach(r => acts.push({ type: 'payment', title: `${r.username || 'User'} — payment ${r.status}`, time: r.created_at })); } catch {}
  acts.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(acts.slice(0, 10));
});

module.exports = router;