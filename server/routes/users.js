const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Add this inside server/routes/users.js
router.patch('/me', auth, async (req, res) => {
  const { theme } = req.body;
  try {
    // Update the user's theme preference in the database
    await db.query('UPDATE users SET theme = $1 WHERE id = $2', [theme, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;