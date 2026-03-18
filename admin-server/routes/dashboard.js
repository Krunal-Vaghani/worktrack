// routes/dashboard.js  — aggregated metrics for the admin dashboard home page
const express = require('express');
const db      = require('../db/postgres');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

// GET /api/dashboard?range=today|week|month
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { range = 'today' } = req.query;

    let fromDate;
    const now = new Date();
    if (range === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      fromDate = new Date(now); fromDate.setDate(now.getDate() - 6);
    } else {
      fromDate = new Date(now); fromDate.setDate(1);
    }
    const from = fromDate.toISOString();

    // Core metrics
    const metrics = await db.query(`
      SELECT
        ROUND(AVG(t.productivity_score)::numeric, 1)   AS "avgProductivity",
        ROUND(SUM(t.active_duration)::numeric / 3600, 1) AS "totalActiveHours",
        ROUND(SUM(t.idle_duration)::numeric   / 3600, 1) AS "totalIdleHours",
        COUNT(t.task_id)::int                            AS "tasksCompleted",
        COUNT(DISTINCT t.user_id)::int                   AS "employees"
      FROM tasks t
      WHERE t.end_time IS NOT NULL AND t.start_time >= $1
    `, [from]);

    // Daily trend (last 7 days)
    const trend = await db.query(`
      SELECT
        TO_CHAR(DATE(start_time), 'Dy DD') AS day,
        COUNT(task_id)::int                AS tasks,
        ROUND(SUM(active_duration) / 3600.0, 1) AS active,
        ROUND(SUM(idle_duration)   / 3600.0, 1) AS idle
      FROM tasks
      WHERE end_time IS NOT NULL AND start_time >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(start_time)
      ORDER BY DATE(start_time)
    `);

    // App usage
    const appUsage = await db.query(`
      SELECT application_name AS name, SUM(duration) AS total
      FROM activity_logs
      WHERE idle_flag = false AND timestamp >= $1
      GROUP BY application_name
      ORDER BY total DESC
      LIMIT 6
    `, [from]);

    // Top employees
    const topEmps = await db.query(`
      SELECT u.name,
        ROUND(AVG(t.productivity_score)::numeric, 0) AS score,
        ROUND(SUM(t.active_duration)::numeric / 3600, 1) AS hours,
        COUNT(t.task_id)::int AS tasks
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.user_id AND t.end_time IS NOT NULL AND t.start_time >= $1
      WHERE u.role = 'employee'
      GROUP BY u.user_id, u.name
      ORDER BY score DESC NULLS LAST
      LIMIT 10
    `, [from]);

    // Recent tasks
    const recent = await db.query(`
      SELECT u.name AS employee, t.task_name AS task,
        t.total_duration AS duration, t.productivity_score AS score,
        TO_CHAR(t.end_time AT TIME ZONE 'UTC', 'HH12:MI AM') AS time
      FROM tasks t JOIN users u ON t.user_id = u.user_id
      WHERE t.end_time IS NOT NULL
      ORDER BY t.end_time DESC
      LIMIT 10
    `);

    // Format app usage with colors
    const palette = ['#6D28D9','#D97706','#059669','#2563EB','#374151','#9CA3AF'];
    const totalAppTime = appUsage.rows.reduce((s, r) => s + Number(r.total), 0) || 1;
    const formattedApps = appUsage.rows.map((r, i) => ({
      name:  r.name,
      value: Math.round(Number(r.total) / totalAppTime * 100),
      color: palette[i] || '#9CA3AF'
    }));

    res.json({
      metrics:       metrics.rows[0]   || {},
      weeklyTrend:   trend.rows        || [],
      appUsage:      formattedApps,
      topEmployees:  topEmps.rows      || [],
      recentTasks:   recent.rows.map(r => ({
        ...r,
        duration: fmtDuration(r.duration),
        score:    Math.round(r.score || 0)
      }))
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

function fmtDuration(s) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

module.exports = router;
