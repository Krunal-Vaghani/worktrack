-- WorkTrack PostgreSQL Schema
-- Run: psql -U worktrack_user -d worktrack -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  user_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  role       TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
  device_id  TEXT,
  password_hash TEXT,  -- only for admin accounts
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  task_id            UUID PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES users(user_id),
  task_name          TEXT NOT NULL,
  start_time         TIMESTAMPTZ NOT NULL,
  end_time           TIMESTAMPTZ,
  total_duration     INTEGER,    -- seconds
  active_duration    INTEGER,
  idle_duration      INTEGER,
  productivity_score NUMERIC(5,2),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  activity_id      UUID PRIMARY KEY,
  task_id          UUID NOT NULL REFERENCES tasks(task_id),
  user_id          UUID NOT NULL REFERENCES users(user_id),
  timestamp        TIMESTAMPTZ NOT NULL,
  application_name TEXT NOT NULL,
  window_title     TEXT,
  duration         INTEGER NOT NULL,
  idle_flag        BOOLEAN DEFAULT false,
  category         TEXT DEFAULT 'neutral' CHECK (category IN ('work','neutral','non-work')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots
CREATE TABLE IF NOT EXISTS screenshots (
  screenshot_id UUID PRIMARY KEY,
  task_id       UUID NOT NULL REFERENCES tasks(task_id),
  user_id       UUID NOT NULL REFERENCES users(user_id),
  timestamp     TIMESTAMPTZ NOT NULL,
  image_path    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- App category overrides (admin-configurable)
CREATE TABLE IF NOT EXISTS app_categories (
  id          SERIAL PRIMARY KEY,
  app_name    TEXT UNIQUE NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('work','neutral','non-work')),
  updated_by  UUID REFERENCES users(user_id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_start    ON tasks(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date    ON tasks(DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_activity_task       ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_time  ON activity_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_app        ON activity_logs(application_name);
