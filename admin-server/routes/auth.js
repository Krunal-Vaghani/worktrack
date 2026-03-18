const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db/postgres');
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'worktrack-dev-secret-CHANGE-IN-PROD';
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '8h';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND active = true', [email.toLowerCase().trim()]);
    const user   = result.rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: JWT_EXPIRY }
    );
    res.json({ token, user: { user_id: user.user_id, name: user.name, role: user.role, email: user.email } });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/setup — create admin (only if none exists)
router.post('/setup', async (req, res) => {
  try {
    const existing = await db.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.rows.length > 0) return res.status(403).json({ error: 'Admin already exists. Use /login.' });
    const { email, password, name = 'Admin' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO users (user_id, name, role, email, password_hash, active) VALUES ('admin',$1,'admin',$2,$3,true)
       ON CONFLICT (user_id) DO UPDATE SET email=$2, password_hash=$3`,
      [name, email.toLowerCase().trim(), hash]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — verify token and return user info
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const user = jwt.verify(header.slice(7), JWT_SECRET);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
