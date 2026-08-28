const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'collabsheets_super_secret_key_2026';
const SUPERADMIN_EMAIL = 'nejamulhaque.works@gmail.com';

// Helper to grant superadmin privileges
const checkSuperAdmin = (email) => {
  return email && email.toLowerCase().trim() === SUPERADMIN_EMAIL.toLowerCase();
};

// REGISTER
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const isSuper = checkSuperAdmin(email);
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, tier, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, tier, is_admin',
      [username, email, hash, isSuper ? 'pro' : 'free', isSuper]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const isSuper = checkSuperAdmin(user.email);
    if (isSuper && !user.is_admin) {
      await db.query('UPDATE users SET is_admin = true, tier = \'pro\' WHERE id = $1', [user.id]);
      user.is_admin = true;
      user.tier = 'pro';
    }

    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin || isSuper }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tier: isSuper ? 'pro' : user.tier,
        is_admin: isSuper || user.is_admin,
        theme: user.theme,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET CURRENT USER (/auth/me)
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const result = await db.query('SELECT id, username, email, tier, is_admin, theme, ai_requests_today FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    const isSuper = checkSuperAdmin(user.email);
    if (isSuper) {
      user.is_admin = true;
      user.tier = 'pro';
    }
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;