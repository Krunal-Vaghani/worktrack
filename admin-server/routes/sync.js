/**
 * /api/sync  — receives data from Electron desktop clients
 * Authentication: X-User-Id + X-Sync-Token headers
 * The sync token is set in .env as SYNC_SECRET and must match
 * what employees configure in their client Settings tab.
 */
const express = require('express');
const db      = require('../db/postgres');
const router  = express.Router();

function clientAuth(req, res, next) {
  const userId    = req.headers['x-user-id'];
  const syncToken = req.headers['x-sync-token'];
  const expected  = process.env.SYNC_SECRET || 'worktrack-sync-secret';
  if (!userId)                    return res.status(401).json({ error: 'Missing X-User-Id' });
  if (syncToken !== expected)     return res.status(401).json({ error: 'Invalid sync token' });
  req.clientUserId = userId;
  next();
}

// POST /api/sync/register — called on first launch to register employee
router.post('/register', clientAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    await db.query(
      `INSERT INTO users (user_id, name, role, device_id)
       VALUES ($1, $2, 'employee', $3)
       ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, device_id = EXCLUDED.device_id`,
      [req.clientUserId, name, req.headers['x-device-id'] || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/tasks
router.post('/tasks', clientAuth, async (req, res) => {
  const { tasks, userName } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) return res.json({ synced: 0 });

  // Ensure user exists
  try {
    await db.query(
      `INSERT INTO users (user_id, name, role, device_id)
       VALUES ($1, $2, 'employee', '')
       ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name`,
      [req.clientUserId, userName || req.clientUserId]
    );
  } catch {}

  let synced = 0;
  for (const t of tasks) {
    try {
      await db.query(`
        INSERT INTO tasks
          (task_id, user_id, task_name, start_time, end_time,
           total_duration, active_duration, idle_duration, productivity_score)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (task_id) DO UPDATE SET
          end_time           = EXCLUDED.end_time,
          total_duration     = EXCLUDED.total_duration,
          active_duration    = EXCLUDED.active_duration,
          idle_duration      = EXCLUDED.idle_duration,
          productivity_score = EXCLUDED.productivity_score
      `, [
        t.task_id, req.clientUserId, t.task_name,
        t.start_time, t.end_time,
        t.total_duration  || 0,
        t.active_duration || 0,
        t.idle_duration   || 0,
        t.productivity_score || 0
      ]);
      synced++;
    } catch (err) {
      console.warn('Task sync error:', t.task_id, err.message);
    }
  }
  res.json({ synced });
});

// POST /api/sync/activity
router.post('/activity', clientAuth, async (req, res) => {
  const { activity } = req.body;
  if (!Array.isArray(activity) || activity.length === 0) return res.json({ synced: 0 });

  let synced = 0;
  for (const a of activity) {
    try {
      await db.query(`
        INSERT INTO activity_logs
          (activity_id, task_id, user_id, timestamp,
           application_name, window_title, duration, idle_flag, category)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (activity_id) DO NOTHING
      `, [
        a.activity_id, a.task_id, req.clientUserId,
        a.timestamp,   a.application_name,
        a.window_title || '', a.duration,
        a.idle_flag === 1 || a.idle_flag === true,
        a.category || 'neutral'
      ]);
      synced++;
    } catch (err) {
      console.warn('Activity sync error:', err.message);
    }
  }
  res.json({ synced });
});

// GET /api/sync/ping — client checks connectivity
router.get('/ping', clientAuth, (req, res) => {
  res.json({ ok: true, userId: req.clientUserId, ts: new Date().toISOString() });
});

module.exports = router;
