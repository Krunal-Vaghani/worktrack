/**
 * PostgreSQL connection pool + schema initialization
 * Uses environment variables from .env
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.postgresql://postgres:okajWMZgySfIabOhQNoxlhtwfGHtvLWm@postgres.railway.internal:5432/railway,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
