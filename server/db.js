const { Pool, types } = require('pg');
require('dotenv').config();

// ✅ TIMESTAMP FIX: Neon stores TIMESTAMP columns as UTC wall-clock.
// Return them as raw strings so the frontend can convert to each viewer's local time.
types.setTypeParser(1114, (value) => value); // timestamp without time zone → raw string

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL || '').includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', (err) => console.error('❌ Unexpected Postgres pool error:', err.message));

const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };