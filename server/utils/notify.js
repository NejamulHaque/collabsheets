const db = require('../db');
async function notify(userId, text, type = 'info') {
  await db.query('INSERT INTO notifications (user_id, text, type) VALUES ($1,$2,$3)', [userId, text, type]).catch(() => {});
}
module.exports = { notify };