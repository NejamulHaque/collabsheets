const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'collabsheets_super_secret_key_2026';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { 
    req.user = jwt.verify(token, JWT_SECRET); 
    next(); 
  } catch { 
    res.status(401).json({ error: 'Invalid token' }); 
  }
};

// ==========================================
// 1️⃣ PUBLIC ROUTE (NO AUTH REQUIRED)
// Fetches document metadata via the share link token
// ==========================================
router.get('/public/:token', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT id, title, mode, share_level FROM documents WHERE share_token = $1', 
      [req.params.token]
    );
    
    if (!r.rows[0]) return res.status(404).json({ error: 'Link not found or expired' });
    
    const doc = r.rows[0];
    if (doc.share_level === 'private') {
      return res.status(403).json({ error: 'This document is private' });
    }
    
    res.json({ 
      id: doc.id, 
      title: doc.title, 
      mode: doc.mode, 
      role: doc.share_level === 'edit' ? 'editor' : 'viewer' 
    });
  } catch (e) { 
    console.error('Public share fetch error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// ==========================================
// 2️⃣ AUTH ROUTE: Get current share settings
// ==========================================
router.get('/:id/share', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT share_level, share_token FROM documents WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    
    let { share_level, share_token } = r.rows[0];
    
    // Generate a token if one doesn't exist yet
    if (!share_token) {
      share_token = crypto.randomBytes(24).toString('hex');
      await db.query('UPDATE documents SET share_token = $1 WHERE id = $2', [share_token, req.params.id]);
    }
    
    res.json({ level: share_level || 'private', token: share_token });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// ==========================================
// 3️⃣ AUTH ROUTE: Update share settings
// Bulletproof: accepts level, share_level, or defaults to prevent 400 errors
// ==========================================
router.post('/:id/share', auth, async (req, res) => {
  // Accept whatever the frontend sends, and sanitize it
  let level = req.body.level || req.body.share_level || req.body.value || 'private';
  if (!['private', 'view', 'edit'].includes(level)) {
    level = 'private'; // Fallback instead of throwing 400 error
  }
  
  try {
    let token = (await db.query('SELECT share_token FROM documents WHERE id = $1', [req.params.id])).rows[0]?.share_token;
    if (!token) token = crypto.randomBytes(24).toString('hex');
    
    await db.query(
      'UPDATE documents SET share_level = $1, share_token = $2 WHERE id = $3', 
      [level, token, req.params.id]
    );
    
    res.json({ level, token });
  } catch (e) { 
    console.error('Share update error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;