# WorkTrack — Employee Productivity Tracker

A self-hosted, multi-employee productivity tracking system.  
Each employee runs a lightweight Windows desktop app; you monitor everyone from a central web dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│  Employee PCs (Windows)          Admin Server (any host)        │
│  ┌──────────────────┐            ┌─────────────────────────┐   │
│  │  Electron App     │  HTTPS ──▶│  Express.js API         │   │
│  │  • Task timer     │  sync      │  • PostgreSQL database  │   │
│  │  • Activity track │◀── auth ──│  • Admin web dashboard  │   │
│  │  • Local SQLite   │            │  • REST API             │   │
│  └──────────────────┘            └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick start — two parts to deploy

### Part 1: Admin Server (you host this once)

### Part 2: Electron Client (employees install this)

---

## Part 1 — Admin Server

### Requirements
- Node.js 18+
- PostgreSQL 14+

### Option A — Local / VPS

```bash
# 1. Install dependencies
cd admin-server
npm install

# 2. Create database
psql -U postgres -c "CREATE DATABASE worktrack;"
psql -U postgres -c "CREATE USER worktrack_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL ON DATABASE worktrack TO worktrack_user;"

# 3. Configure environment
cp .env.example .env
# Edit .env — set DB_PASS, JWT_SECRET, SYNC_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 4. Build admin dashboard
cd ../admin-dashboard
npm install
npm run build

# 5. Start server
cd ../admin-server
node server.js
# Server runs at http://localhost:3001
# Admin dashboard at http://localhost:3001
```

### Option B — Railway (free tier, easiest)

1. Fork this repo to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select the `admin-server` folder as the service root
4. Add a PostgreSQL plugin
5. Set environment variables (copy from `.env.example`):
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — from Railway PostgreSQL plugin
   - `JWT_SECRET` — run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` 
   - `SYNC_SECRET` — any random string, share with employees
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — your admin login
6. Railway auto-deploys. Your server URL will be `https://your-app.railway.app`

### Option C — Render (free tier)

1. Go to https://render.com → New Web Service
2. Connect your GitHub repo, set root to `admin-server`
3. Build command: `npm install && cd ../admin-dashboard && npm install && npm run build`
4. Start command: `node server.js`
5. Add a PostgreSQL database and set env vars same as Railway

### Option D — Docker

```bash
# Build and run everything with Docker Compose
docker compose up -d
```

The included `docker-compose.yml` starts the server + PostgreSQL automatically.

---

## Part 2 — Electron Client (employee computers)

### Build the .exe

```bash
# From the worktrack root folder:

# 1. Install dependencies
setup.bat

# 2. Build the installer
npm run build:renderer
npx electron-builder --win

# Output: dist\WorkTrack Setup 1.0.0.exe  (~80MB)
```

### Distribute to employees

1. Share `dist\WorkTrack Setup 1.0.0.exe`
2. Employees install it (no admin rights needed)
3. On first launch, sign in with credentials you created in the admin dashboard
4. Go to **Settings** tab and enter:
   - **Server URL**: `https://your-server.railway.app` (or your server address)
   - **Sync token**: the `SYNC_SECRET` value from your `.env`
5. Click **Test now** to verify the connection

---

## Admin Dashboard

Access at your server URL (e.g. `https://your-app.railway.app`).

Login with the email and password from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

### Features
- **History tab** — all employees' task history, filterable by employee and date
- **Today tab** — live view, select individual employee or all combined
- **Settings tab** — manage employees, set passwords, enable/disable access

---

## How employee sync works

```
Employee starts task
       ↓
Local SQLite stores data in real-time
       ↓
Every 60 seconds (or on task stop):
       ↓
SyncService checks server health (3s timeout)
       ↓
  Connected? → POST /api/sync/tasks + /api/sync/activity
  Offline?   → keep in local queue, retry with backoff
       ↓
Server upserts into PostgreSQL
       ↓
Admin dashboard reads from PostgreSQL
```

**Offline resilience**: if an employee loses internet, all data stays in local SQLite. When they reconnect, everything syncs automatically. No data is ever lost.

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default 3001) |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | PostgreSQL port (default 5432) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASS` | Yes | Database password |
| `DB_SSL` | No | Set `true` for SSL (Railway/Render/Supabase) |
| `JWT_SECRET` | Yes | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiry (default `8h`) |
| `SYNC_SECRET` | Yes | Shared token between server and clients |
| `ADMIN_EMAIL` | Yes | Initial admin email |
| `ADMIN_PASSWORD` | Yes | Initial admin password |
| `CORS_ORIGIN` | No | Restrict CORS origins in production |

---

## API Reference

### Client sync endpoints (used by Electron app)
```
POST /api/sync/register   Register/update employee
POST /api/sync/tasks      Upload completed tasks
POST /api/sync/activity   Upload activity logs
GET  /api/sync/ping       Check connectivity
```
All require headers: `X-User-Id: <userId>` and `X-Sync-Token: <SYNC_SECRET>`

### Admin endpoints (used by dashboard, require JWT)
```
POST /api/auth/login         Login
GET  /api/auth/me            Verify token
GET  /api/dashboard          Aggregated metrics
GET  /api/employees          List employees
POST /api/employees          Create employee
PATCH /api/employees/:id     Update employee
DELETE /api/employees/:id    Delete employee
GET  /api/employees/:id/tasks  Employee tasks
GET  /api/tasks              All tasks (filterable)
GET  /api/activity           Activity logs
GET  /api/reports/csv        CSV export
GET  /api/reports/excel      Excel export
GET  /api/reports/pdf        PDF export
```

---

## Security notes

- Never commit `.env` to Git (it's in `.gitignore`)
- Change `SYNC_SECRET` to a random string before deploying
- Change `JWT_SECRET` to a random string before deploying
- The local SQLite database on employee machines is in `%APPDATA%\worktrack\`
- Employee data is stored locally until synced — employees cannot access each other's data

---

## Project structure

```
worktrack/
├── electron/           Desktop client (Node.js + Electron)
│   ├── main.js         App entry, IPC, tray, window
│   ├── preload.js      Secure IPC bridge to React
│   ├── database/       Local SQLite via sql.js
│   ├── tracker/        Activity monitor, idle detector
│   └── sync/           SyncService (offline queue → server)
├── renderer/           Employee UI (React + Vite)
│   └── src/components/
│       ├── Login.jsx
│       ├── EmployeeShell.jsx
│       ├── TaskTimer.jsx
│       ├── TaskHistory.jsx
│       ├── DailySummary.jsx
│       └── EmployeeSettings.jsx
├── admin-server/       Express.js REST API
│   ├── server.js
│   ├── routes/         auth, sync, employees, tasks, reports
│   └── db/postgres.js  PostgreSQL connection + schema
├── admin-dashboard/    Admin web UI (React + Vite)
│   └── src/pages/      Dashboard, Employees, Reports, Settings
├── build/assets/       App icons
└── package.json        Electron + electron-builder config
```

---

## Docker Compose (optional)

```yaml
# docker-compose.yml — already included in repo
# Start with: docker compose up -d
```

Starts:
- `postgres` — PostgreSQL 15
- `server` — Node.js admin server on port 3001
