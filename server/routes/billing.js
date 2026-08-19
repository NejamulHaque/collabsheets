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

let sendPaymentAlert = null;
try { sendPaymentAlert = require('../utils/mailer').sendPaymentAlert; } catch {}

// POST /billing/notify-payment — user clicked "I have paid ₹749"
router.post('/notify-payment', auth, async (req, res) => {
  const { utr } = req.body || {};
  try {
    const pay = await db.query(
      "INSERT INTO payments (user_id, amount, utr, status) VALUES ($1, 749, $2, 'pending') RETURNING *",
      [req.user.id, utr || null]
    );
    // Email the admin (never fails the request)
    try {
      const u = await db.query('SELECT username, email FROM users WHERE id = $1', [req.user.id]);
      if (sendPaymentAlert) await sendPaymentAlert({ username: u.rows[0]?.username, email: u.rows[0]?.email, amount: 749, utr });
    } catch (e) { console.error('mail skip:', e.message); }
    res.json(pay.rows[0]);
  } catch (e) {
    console.error('❌ notify-payment error:', e.message);
    res.status(500).json({ error: 'Failed to notify payment' });
  }
});

// GET /billing/my-payments — user's payment history (Profile page)
router.get('/my-payments', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch { res.json([]); }
});

// Stubs so old frontend calls don't 404
router.post('/sync-session', auth, async (req, res) => res.json({ ok: true }));
router.post('/create-checkout-session', auth, async (req, res) =>
  res.status(500).json({ error: 'Card payments coming soon — please use UPI.' }));

module.exports = router;