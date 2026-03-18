/**
 * /api/settings — server-side settings stored in PostgreSQL
 * Admin can set idle threshold which applies to all employees.
 */
const express = require('express');
const db      = require('../db/postgres');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

// Create settings table on first use
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}

// GET /api/settings
router.get('/', requireAdmin, async (req, res) => {
  try {
    await ensureTable();
    const result = await db.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    });
    // Defaults
    const defaults = {
      idleThreshold:     300,
      serverUrl:         process.env.SERVER_URL || '',
      syncToken:         process.env.SYNC_SECRET || 'worktrack-sync-secret',
    };
    res.json({ ...defaults, ...settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
router.post('/', requireAdmin, async (req, res) => {
  try {
    await ensureTable();
    const allowed = ['idleThreshold', 'workStart', 'workEnd', 'screenshotEnabled', 'screenshotInterval'];
    for (const [key, value] of Object.entries(req.body)) {
      if (!allowed.includes(key)) continue;
      await db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/public — for employee clients to fetch shared settings (no auth)
router.get('/public', async (req, res) => {
  const syncToken = req.headers['x-sync-token'];
  const expected  = process.env.SYNC_SECRET || 'worktrack-sync-secret';
  if (syncToken !== expected) return res.status(401).json({ error: 'Invalid sync token' });
  try {
    await ensureTable();
    const result = await db.query("SELECT key, value FROM settings WHERE key IN ('idleThreshold')");
    const settings = { idleThreshold: 300 };
    result.rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
