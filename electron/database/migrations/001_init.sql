-- WorkTrack schema v2

CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'employee',
  email      TEXT,
  password   TEXT,
  device_id  TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id            TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL,
  task_name          TEXT NOT NULL,
  start_time         TEXT NOT NULL,
  end_time           TEXT,
  total_duration     INTEGER,
  active_duration    INTEGER,
  idle_duration      INTEGER,
  productivity_score REAL,
  synced             INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  activity_id      TEXT PRIMARY KEY,
  task_id          TEXT NOT NULL,
  timestamp        TEXT NOT NULL,
  application_name TEXT NOT NULL,
  window_title     TEXT,
  duration         INTEGER NOT NULL,
  idle_flag        INTEGER DEFAULT 0,
  category         TEXT DEFAULT 'neutral',
  synced           INTEGER DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);

CREATE TABLE IF NOT EXISTS screenshots (
  screenshot_id TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL,
  timestamp     TEXT NOT NULL,
  image_path    TEXT NOT NULL,
  synced        INTEGER DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_user    ON tasks(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_logs(task_id, timestamp);
