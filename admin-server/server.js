/**
 * WorkTrack Admin Server
 * Express.js REST API + serves admin dashboard static files.
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const authRoutes     = require('./routes/auth');
const taskRoutes     = require('./routes/tasks');
const activityRoutes = require('./routes/activity');
const reportRoutes   = require('./routes/reports');
const syncRoutes     = require('./routes/sync');
const db             = require('./db/postgres');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id']
}));

// ── Request limits ───────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth', authLimiter);
app.use(limiter);

// ── Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health check ─────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'db-error' });
  }
});

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/tasks',    taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports',  reportRoutes);
app.use('/api/sync',      syncRoutes);
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/employees', require('./routes/employees'));

// ── Admin dashboard (React SPA) ──────────────────────────
// In Docker: /app/admin-dashboard/dist  |  In dev: ../admin-dashboard/dist
const dashboardDist = process.env.DASHBOARD_DIST
  || path.join(__dirname, '../admin-dashboard/dist');
app.use(express.static(dashboardDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(dashboardDist, 'index.html'));
});

// ── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Start ─────────────────────────────────────────────────
async function start() {
  try {
    await db.initialize();
    app.listen(PORT, () => {
      console.log(`✓ WorkTrack admin server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
