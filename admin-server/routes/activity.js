// routes/activity.js
const express = require('express');
const db      = require('../db/postgres');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

// GET /api/activity?userId=&taskId=&date=
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { userId, taskId, date, limit = 500 } = req.query;
    let q = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    let i = 1;
    if (userId) { q += ` AND user_id = $${i++}`; params.push(userId); }
    if (taskId) { q += ` AND task_id = $${i++}`; params.push(taskId); }
    if (date)   { q += ` AND DATE(timestamp) = $${i++}`; params.push(date); }
    q += ` ORDER BY timestamp ASC LIMIT $${i++}`;
    params.push(parseInt(limit));
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity/app-summary?date=&userId=
router.get('/app-summary', requireAdmin, async (req, res) => {
  try {
    const { date, userId, from, to } = req.query;
    const params = [];
    let i = 1;
    let filter = 'WHERE al.idle_flag = false';
    if (date)   { filter += ` AND DATE(al.timestamp) = $${i++}`; params.push(date); }
    if (from)   { filter += ` AND al.timestamp >= $${i++}`;      params.push(from); }
    if (to)     { filter += ` AND al.timestamp <= $${i++}`;      params.push(to); }
    if (userId) { filter += ` AND al.user_id = $${i++}`;         params.push(userId); }

    const result = await db.query(`
      SELECT application_name, category,
             SUM(duration) as total_seconds,
             COUNT(DISTINCT task_id) as task_count
      FROM activity_logs al
      ${filter}
      GROUP BY application_name, category
      ORDER BY total_seconds DESC
      LIMIT 30
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
