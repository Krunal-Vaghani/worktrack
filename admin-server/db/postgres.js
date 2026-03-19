/**
 * PostgreSQL connection pool + schema initialization
 * Uses environment variables from .env
 */
const { Pool } = require('pg');

// Railway injects DATABASE_URL automatically when you add a Postgres plugin.
// Always prefer it over individual vars.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },  // required on Railway
      max: 20,
      idleTimeoutMillis:      30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'worktrack',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASS     || process.env.DB_PASSWORD || 'postgres',
      max:      20,
      idleTimeoutMillis:      30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

console.log('[DB] Using', process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual DB_* vars');
const pool = new Pool(poolConfig);

pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initialize() {
  console.log('[DB] Initializing schema…');
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id    TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'employee',
      device_id  TEXT DEFAULT '',
      email      TEXT UNIQUE,
      password_hash TEXT,
      active     BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id            TEXT PRIMARY KEY,
      user_id            TEXT NOT NULL,
      task_name          TEXT NOT NULL,
      start_time         TIMESTAMPTZ NOT NULL,
      end_time           TIMESTAMPTZ,
      total_duration     INTEGER DEFAULT 0,
      active_duration    INTEGER DEFAULT 0,
      idle_duration      INTEGER DEFAULT 0,
      productivity_score REAL    DEFAULT 0,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      activity_id      TEXT PRIMARY KEY,
      task_id          TEXT NOT NULL,
      user_id          TEXT NOT NULL,
      timestamp        TIMESTAMPTZ NOT NULL,
      application_name TEXT NOT NULL,
      window_title     TEXT DEFAULT '',
      duration         INTEGER NOT NULL DEFAULT 0,
      idle_flag        BOOLEAN DEFAULT false,
      category         TEXT DEFAULT 'neutral',
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      screenshot_id TEXT PRIMARY KEY,
      task_id       TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      timestamp     TIMESTAMPTZ NOT NULL,
      image_path    TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_start ON tasks(user_id, start_time DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_date       ON tasks(DATE(start_time));
    CREATE INDEX IF NOT EXISTS idx_activity_task    ON activity_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user    ON activity_logs(user_id, timestamp DESC);
  `);

  // Seed default admin if none exists
  // Always ensure admin has correct password (fixes stale hash issues)
  const bcrypt = require('bcrypt');
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const existing  = await query("SELECT user_id, password_hash FROM users WHERE user_id = 'admin'");
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPass, 12);
    await query(
      `INSERT INTO users (user_id, name, role, active, password_hash)
       VALUES ('admin', 'Admin', 'admin', true, $1)`,
      [hash]
    );
    console.log(`[DB] Admin created: user_id=admin password=${adminPass}`);
  } else if (!existing.rows[0].password_hash) {
    const hash = await bcrypt.hash(adminPass, 12);
    await query('UPDATE users SET password_hash=$1 WHERE user_id=$2', [hash, 'admin']);
    console.log(`[DB] Admin password fixed`);
  }

  console.log('[DB] Schema ready ✓');
}

module.exports = { query, initialize, pool };
