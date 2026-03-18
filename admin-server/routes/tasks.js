const express = require('express');
const db      = require('../db/postgres');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

// GET /api/tasks?userId=&date=&from=&to=&limit=
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { userId, date, from, to, limit = 100, offset = 0 } = req.query;
    let q = `
      SELECT t.*, u.name as user_name
      FROM tasks t
      JOIN users u ON t.user_id = u.user_id
      WHERE t.end_time IS NOT NULL
    `;
    const params = [];
    let i = 1;

    if (userId)  { q += ` AND t.user_id = $${i++}`;               params.push(userId); }
    if (date)    { q += ` AND DATE(t.start_time) = $${i++}`;      params.push(date); }
    if (from)    { q += ` AND t.start_time >= $${i++}`;           params.push(from); }
    if (to)      { q += ` AND t.start_time <= $${i++}`;           params.push(to); }

    q += ` ORDER BY t.start_time DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/summary?date=&userId=
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const { date, userId, from, to } = req.query;
    let dateFilter = '';
    const params = [];
    let i = 1;

    if (date)  { dateFilter = `AND DATE(t.start_time) = $${i++}`;       params.push(date); }
    if (from)  { dateFilter += ` AND t.start_time >= $${i++}`;          params.push(from); }
    if (to)    { dateFilter += ` AND t.start_time <= $${i++}`;          params.push(to); }
    if (userId){ dateFilter += ` AND t.user_id = $${i++}`;              params.push(userId); }

    const result = await db.query(`
      SELECT
        u.user_id, u.name,
        COUNT(t.task_id)::int              AS task_count,
        SUM(t.total_duration)              AS total_seconds,
        SUM(t.active_duration)             AS active_seconds,
        SUM(t.idle_duration)               AS idle_seconds,
        ROUND(AVG(t.productivity_score)::numeric, 1) AS avg_score
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.user_id AND t.end_time IS NOT NULL ${dateFilter}
      WHERE u.role = 'employee'
      GROUP BY u.user_id, u.name
      ORDER BY avg_score DESC NULLS LAST
    `, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
