/**
 * PostgreSQL connection pool + schema initialization
 * Uses environment variables from .env
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
