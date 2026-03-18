const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../db/postgres');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

// GET /api/employees
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.user_id, u.name, u.role, u.device_id, u.active,
        COALESCE(ROUND(AVG(t.productivity_score)::numeric, 0), 0) AS avg_score,
        COALESCE(ROUND(SUM(t.active_duration)::numeric / 3600, 1), 0) AS total_hours,
        COUNT(t.task_id)::int AS total_tasks,
        MAX(t.end_time) AS last_active
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.user_id AND t.end_time IS NOT NULL
      WHERE u.role = 'employee'
      GROUP BY u.user_id, u.name, u.role, u.device_id, u.active
      ORDER BY u.name ASC
    `);

    const now = Date.now();
    const rows = result.rows.map(emp => {
      const lastMs  = emp.last_active ? new Date(emp.last_active).getTime() : 0;
      const diffMin = (now - lastMs) / 60000;
      let status   = 'offline', last_seen = 'Never';
      if (emp.last_active) {
        if      (diffMin < 5)  { status = 'online';  last_seen = `${Math.floor(diffMin)}m ago`; }
        else if (diffMin < 30) { status = 'idle';    last_seen = `${Math.floor(diffMin)}m ago`; }
        else { const h = Math.floor(diffMin/60); last_seen = h >= 24 ? `${Math.floor(h/24)}d ago` : h > 0 ? `${h}h ago` : `${Math.floor(diffMin)}m ago`; }
      }
      return { ...emp, status, last_seen };
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/employees — create employee
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const userId = name.trim(); // name IS the user_id
    // Check uniqueness
    const exists = await db.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
    if (exists.rows.length > 0) return res.status(409).json({ error: `User "${userId}" already exists` });
    await db.query(
      `INSERT INTO users (user_id, name, role, device_id, active) VALUES ($1,$2,$3,'',true)`,
      [userId, userId, role || 'employee']
    );
    res.json({ success: true, user_id: userId, name: userId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/employees/:id — update role or disable
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { role, active } = req.body;
    if (role !== undefined)   await db.query('UPDATE users SET role = $1 WHERE user_id = $2', [role, req.params.id]);
    if (active !== undefined) await db.query('UPDATE users SET active = $1 WHERE user_id = $2', [active, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/employees/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM activity_logs WHERE user_id = $1', [req.params.id]);
    await db.query('DELETE FROM tasks WHERE user_id = $1', [req.params.id]);
    await db.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/employees/:id/tasks?date=
router.get('/:id/tasks', requireAdmin, async (req, res) => {
  try {
    const { date, from, to, limit = 100 } = req.query;
    let q = 'SELECT * FROM tasks WHERE user_id = $1 AND end_time IS NOT NULL';
    const params = [req.params.id];
    let i = 2;
    if (date) { q += ` AND DATE(start_time) = $${i++}`; params.push(date); }
    if (from) { q += ` AND start_time >= $${i++}`; params.push(from); }
    if (to)   { q += ` AND start_time <= $${i++}`; params.push(to); }
    q += ` ORDER BY start_time DESC LIMIT $${i++}`;
    params.push(parseInt(limit));
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
