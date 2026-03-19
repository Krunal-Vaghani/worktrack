/**
 * /api/settings
 * Server-side settings stored in PostgreSQL.
 * Single source of truth for both EXE clients and web dashboard.
 */
const express = require('express');
const db      = require('../db/postgres');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

const DEFAULTS = {
  idleThreshold:      300,
  screenshotEnabled:  false,
  screenshotInterval: 600,
  autoStart:          true,
  minimizeToTray:     true,
  workStart:          '09:00',
  workEnd:            '18:00',
};

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}

async function getAll() {
  await ensureTable();
  const result = await db.query('SELECT key, value FROM settings');
  const s = { ...DEFAULTS };
  result.rows.forEach(r => {
    try { s[r.key] = JSON.parse(r.value); } catch { s[r.key] = r.value; }
  });
  // Always inject live server values
  s.serverUrl  = process.env.RAILWAY_STATIC_URL
    ? `https://${process.env.RAILWAY_STATIC_URL}`
    : (process.env.SERVER_URL || '');
  s.syncToken  = process.env.SYNC_SECRET || 'worktrack-sync-secret';
  return s;
}

// GET /api/settings  (admin JWT required)
router.get('/', requireAdmin, async (req, res) => {
  try { res.json(await getAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings  (admin JWT required)
router.post('/', requireAdmin, async (req, res) => {
  try {
    await ensureTable();
    const allowed = ['idleThreshold','screenshotEnabled','screenshotInterval',
                     'autoStart','minimizeToTray','workStart','workEnd'];
    for (const [key, value] of Object.entries(req.body)) {
      if (!allowed.includes(key)) continue;
      await db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, JSON.stringify(value)]
      );
    }
    res.json({ success: true, settings: await getAll() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/settings/public  (sync token auth — for EXE clients)
router.get('/public', async (req, res) => {
  const token    = req.headers['x-sync-token'];
  const expected = process.env.SYNC_SECRET || 'worktrack-sync-secret';
  if (token !== expected) return res.status(401).json({ error: 'Invalid sync token' });
  try { res.json(await getAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
