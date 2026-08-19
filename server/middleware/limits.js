const db = require('../db');

exports.checkDocumentLimit = async (req, res, next) => {
  try {
    const userRes = await db.query('SELECT tier FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows[0].tier === 'free') {
      const count = await db.query('SELECT COUNT(*) FROM documents WHERE owner_id = $1', [req.user.id]);
      if (parseInt(count.rows[0].count) >= 3) {
        return res.status(403).json({ error: 'Document limit reached (3/3). Upgrade to Pro for unlimited sheets!' });
      }
    }
    next();
  } catch (err) { next(err); }
};

exports.checkAILimit = async (req, res, next) => {
  try {
    const userRes = await db.query('SELECT tier, ai_requests_today, ai_reset_date FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    const today = new Date().toISOString().split('T')[0];
    if (user.ai_reset_date !== today) {
      await db.query('UPDATE users SET ai_requests_today = 0, ai_reset_date = $1 WHERE id = $2', [today, req.user.id]);
      user.ai_requests_today = 0;
    }
    if (user.tier === 'free' && user.ai_requests_today >= 5) {
      return res.status(429).json({ error: 'Daily AI limit reached (5/5). Upgrade to Pro for unlimited AI!' });
    }
    req.userTier = user.tier;
    next();
  } catch (err) { next(err); }
};