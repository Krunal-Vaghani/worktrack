const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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
    CREATE INDEX IF NOT EXISTS idx_tasks_date 
ON tasks ((start_time::date));
    CREATE INDEX IF NOT EXISTS idx_activity_task    ON activity_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user    ON activity_logs(user_id, timestamp DESC);
  `);

  // Seed default admin if none exists
  const existing = await query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
  if (existing.rows.length === 0) {
    const bcrypt = require('bcrypt');
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@worktrack.local';
    const hash = await bcrypt.hash(adminPass, 12);
    await query(
      `INSERT INTO users (user_id, name, role, email, password_hash, active)
       VALUES ('admin', 'Admin', 'admin', $1, $2, true)
       ON CONFLICT (user_id) DO UPDATE SET password_hash = $2`,
      [adminEmail, hash]
    );
    console.log(`[DB] Admin seeded: email=${adminEmail} password=${adminPass}`);
  }

  console.log('[DB] Schema ready ✓');
}

module.exports = { query, initialize, pool };
