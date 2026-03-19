/**
 * SyncService — syncs every 30s automatically once logged in.
 * Server is the single source of truth for settings AND employee list.
 */
const log = require('electron-log');

const SERVER_URL  = 'https://worktrack-production-599c.up.railway.app';
const SYNC_TOKEN  = 'mycompany-sync-2025';

class SyncService {
  constructor(db, store) {
    this.db           = db;
    this.store        = store;
    this.isConnected  = false;
    this.lastSyncTime = null;
    this._interval    = null;
    this._retryDelay  = 10000;
    this._MAX_DELAY   = 120000;
    this._onSettingsChange = null; // callback when server settings arrive
  }

  onSettingsChange(cb) { this._onSettingsChange = cb; }

  _getUrl()   { return this.store.get('serverUrl') || SERVER_URL; }
  _getToken() { return this.store.get('syncToken') || SYNC_TOKEN; }
  _getUserId(){ return this.store.get('userId'); }
  _getName()  { return this.store.get('userName') || this._getUserId(); }

  _headers() {
    return {
      'Content-Type':  'application/json',
      'X-User-Id':     this._getUserId(),
      'X-Sync-Token':  this._getToken(),
      'X-Device-Id':   (() => { try { return require('os').hostname(); } catch { return 'unknown'; } })(),
    };
  }

  start() {
    // Ensure correct defaults are stored
    if (!this.store.get('serverUrl')) this.store.set('serverUrl', SERVER_URL);
    if (!this.store.get('syncToken')) this.store.set('syncToken', SYNC_TOKEN);

    // First sync after 3s, then every 30s
    this._timer1 = setTimeout(() => this.syncNow(), 3000);
    this._interval = setInterval(() => this.syncNow(), 30000);
    log.info('SyncService started, server:', this._getUrl());
  }

  stop() {
    clearTimeout(this._timer1);
    if (this._interval) clearInterval(this._interval);
  }

  getPendingCount() {
    try {
      const t = this.db.prepare('SELECT COUNT(*) as c FROM tasks WHERE synced=0 AND end_time IS NOT NULL').get();
      const a = this.db.prepare('SELECT COUNT(*) as c FROM activity_logs WHERE synced=0').get();
      return (t?.c || 0) + (a?.c || 0);
    } catch { return 0; }
  }

  async syncNow() {
    const userId = this._getUserId();
    if (!userId) return { success: false, reason: 'not-logged-in' };

    const serverUrl = this._getUrl();
    const headers   = this._headers();

    try {
      // Health check with 4s timeout
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(`${serverUrl}/api/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error('health check failed');

      this.isConnected = true;
      this._retryDelay = 10000;

      // Run all sync tasks
      await this._register(serverUrl, headers);
      await this._fetchSettings(serverUrl, headers);
      await this._syncTasks(serverUrl, headers);
      await this._syncActivity(serverUrl, headers);

      this.lastSyncTime = new Date().toISOString();
      log.info(`Sync OK | pending=${this.getPendingCount()}`);
      return { success: true, lastSync: this.lastSyncTime };

    } catch (err) {
      this.isConnected = false;
      this._retryDelay = Math.min(this._retryDelay * 2, this._MAX_DELAY);
      log.debug('Sync failed:', err.message);
      return { success: false, reason: 'offline', error: err.message };
    }
  }

  async _register(serverUrl, headers) {
    try {
      await fetch(`${serverUrl}/api/sync/register`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: this._getName() }),
      });
    } catch {}
  }

  async _fetchSettings(serverUrl, headers) {
    try {
      const res = await fetch(`${serverUrl}/api/settings/public`, { headers });
      if (!res.ok) return;
      const s = await res.json();
      let changed = false;
      const keys = ['idleThreshold','screenshotEnabled','screenshotInterval'];
      for (const key of keys) {
        if (s[key] !== undefined && this.store.get(key) !== s[key]) {
          this.store.set(key, s[key]);
          changed = true;
          log.info(`Setting from server: ${key}=${s[key]}`);
        }
      }
      if (changed && this._onSettingsChange) this._onSettingsChange();
    } catch (err) { log.debug('fetchSettings failed:', err.message); }
  }

  async _syncTasks(serverUrl, headers) {
    const tasks = this.db.prepare(
      'SELECT * FROM tasks WHERE synced=0 AND end_time IS NOT NULL LIMIT 100'
    ).all();
    if (!tasks.length) return;

    const res = await fetch(`${serverUrl}/api/sync/tasks`, {
      method: 'POST', headers,
      body: JSON.stringify({ tasks, userName: this._getName() }),
    });
    if (res.ok) {
      const ids = tasks.map(t => t.task_id);
      this.db.prepare(
        `UPDATE tasks SET synced=1 WHERE task_id IN (${ids.map(()=>'?').join(',')})`
      ).run(...ids);
      log.info('Tasks synced:', tasks.length);
    }
  }

  async _syncActivity(serverUrl, headers) {
    const rows = this.db.prepare(
      'SELECT * FROM activity_logs WHERE synced=0 LIMIT 500'
    ).all();
    if (!rows.length) return;

    const res = await fetch(`${serverUrl}/api/sync/activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity: rows }),
    });
    if (res.ok) {
      const ids = rows.map(r => r.activity_id);
      this.db.prepare(
        `UPDATE activity_logs SET synced=1 WHERE activity_id IN (${ids.map(()=>'?').join(',')})`
      ).run(...ids);
      log.info('Activity synced:', rows.length);
    }
  }

  // ── Admin helpers — operate on server directly via sync token ──────────────

  async serverGetEmployees() {
    try {
      const res = await fetch(`${this._getUrl()}/api/sync/employees`, { headers: this._headers() });
      return res.ok ? res.json() : [];
    } catch { return []; }
  }

  async serverCreateEmployee(name, role) {
    try {
      const res = await fetch(`${this._getUrl()}/api/sync/employees`, {
        method: 'POST', headers: this._headers(),
        body: JSON.stringify({ name, role }),
      });
      return res.json();
    } catch (err) { return { error: err.message }; }
  }

  async serverUpdateEmployee(userId, data) {
    try {
      const res = await fetch(`${this._getUrl()}/api/sync/employees/${userId}`, {
        method: 'PATCH', headers: this._headers(),
        body: JSON.stringify(data),
      });
      return res.json();
    } catch (err) { return { error: err.message }; }
  }

  async serverDeleteEmployee(userId) {
    try {
      const res = await fetch(`${this._getUrl()}/api/sync/employees/${userId}`, {
        method: 'DELETE', headers: this._headers(),
      });
      return res.json();
    } catch (err) { return { error: err.message }; }
  }

  async serverSaveSettings(settings) {
    try {
      const res = await fetch(`${this._getUrl()}/api/settings/public`, {
        method: 'POST', headers: this._headers(),
        body: JSON.stringify(settings),
      });
      return res.ok ? res.json() : { error: 'failed' };
    } catch (err) { return { error: err.message }; }
  }
}

module.exports = SyncService;
