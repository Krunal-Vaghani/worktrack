/**
 * /api/auth — login by user_id (not email).
 * Consistent with the EXE which uses user_id as the login identity.
 */
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db/postgres');
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'worktrack-dev-secret-CHANGE-IN-PROD';
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '8h';

// POST /api/auth/login  — accepts user_id + password
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password)
      return res.status(400).json({ error: 'User ID and password required' });

    const result = await db.query(
      'SELECT * FROM users WHERE user_id = $1 AND active = true',
      [userId.trim()]
    );
    const user = result.rows[0];
    if (!user || !user.password_hash)
      return res.status(401).json({ error: 'Invalid User ID or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid User ID or password' });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: JWT_EXPIRY }
    );
    res.json({ token, user: { user_id: user.user_id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
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
