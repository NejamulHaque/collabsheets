const db = require('../db');
module.exports = async (req, res, next) => {
  try {
    const r = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (r.rows[0]?.is_admin) return next();
    return res.status(403).json({ error: 'Admins only' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};