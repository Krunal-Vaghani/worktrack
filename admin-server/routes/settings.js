/**
 * /api/settings — single source of truth for all config.
 * Web dashboard uses JWT. EXE clients use X-Sync-Token.
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

function getServerUrl() {
  // Railway provides RAILWAY_PUBLIC_DOMAIN (not RAILWAY_STATIC_URL)
  if (process.env.RAILWAY_PUBLIC_DOMAIN)
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  if (process.env.SERVER_URL) return process.env.SERVER_URL;
  return 'https://worktrack-production-599c.up.railway.app';
}

async function getAll() {
  await ensureTable();
  const result = await db.query('SELECT key, value FROM settings');
  const s = { ...DEFAULTS };
  result.rows.forEach(r => {
    try { s[r.key] = JSON.parse(r.value); } catch { s[r.key] = r.value; }
  });
  s.serverUrl = getServerUrl();
  s.syncToken = process.env.SYNC_SECRET || 'mycompany-sync-2025';
  return s;
}

async function saveMany(body) {
  await ensureTable();
  const allowed = ['idleThreshold','screenshotEnabled','screenshotInterval',
                   'autoStart','minimizeToTray'];
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) continue;
    await db.query(
      `INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
      [key, JSON.stringify(value)]
    );
  }
  return getAll();
}

// GET /api/settings  (JWT — web dashboard)
router.get('/', requireAdmin, async (req, res) => {
  try { res.json(await getAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings  (JWT — web dashboard)
router.post('/', requireAdmin, async (req, res) => {
  try { res.json({ success:true, settings: await saveMany(req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/settings/public  (sync token — EXE clients read)
router.get('/public', async (req, res) => {
  const token    = req.headers['x-sync-token'];
  const expected = process.env.SYNC_SECRET || 'mycompany-sync-2025';
  if (token !== expected) return res.status(401).json({ error: 'Invalid sync token' });
  try { res.json(await getAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings/public  (sync token — EXE admin writes)
router.post('/public', async (req, res) => {
  const token    = req.headers['x-sync-token'];
  const expected = process.env.SYNC_SECRET || 'mycompany-sync-2025';
  if (token !== expected) return res.status(401).json({ error: 'Invalid sync token' });
  try { res.json({ success:true, settings: await saveMany(req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
