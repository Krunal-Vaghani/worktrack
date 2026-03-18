/**
 * SyncService
 * Offline-first sync: batches unsynced local SQLite records and
 * uploads them to the admin server when online.
 *
 * Auth: X-User-Id + X-Sync-Token headers (token set in .env SYNC_SECRET)
 */
const log = require('electron-log');

class SyncService {
  constructor(db, store) {
    this.db   = db;
    this.store = store;
    this.isConnected  = false;
    this.lastSyncTime = null;
    this._interval    = null;
    this._retryDelay  = 10000;
    this._MAX_DELAY   = 300000;
  }

  start() {
    // First attempt after 8s (let app fully boot first)
    setTimeout(() => this.syncNow(), 8000);
    // Then every 60s
    this._interval = setInterval(() => this.syncNow(), 60000);
    log.info('SyncService started');
  }

  stop() { if (this._interval) clearInterval(this._interval); }

  getPendingCount() {
    try {
      const t = this.db.prepare('SELECT COUNT(*) as c FROM tasks WHERE synced = 0 AND end_time IS NOT NULL').get();
      const a = this.db.prepare('SELECT COUNT(*) as c FROM activity_logs WHERE synced = 0').get();
      return (t?.c || 0) + (a?.c || 0);
    } catch { return 0; }
  }

  async syncNow() {
    const serverUrl = this.store.get('serverUrl');
    const userId    = this.store.get('userId');
    const userName  = this.store.get('userName');
    const syncToken = this.store.get('syncToken') || 'worktrack-sync-secret';

    if (!serverUrl || !userId) return { success: false, reason: 'no-config' };

    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id':    userId,
      'X-Sync-Token': syncToken,
      'X-Device-Id':  require('os').hostname(),
    };

    try {
      // Health check with 3s timeout
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 3000);
      await fetch(`${serverUrl}/api/health`, { signal: ctrl.signal });
      clearTimeout(t);

      this.isConnected  = true;
      this._retryDelay  = 10000;

      // Register/update user on server
      await this._register(serverUrl, headers, userName);
      await this._syncTasks(serverUrl, headers, userName);
      await this._syncActivity(serverUrl, headers);

      this.lastSyncTime = new Date().toISOString();
      log.info(`Sync OK at ${this.lastSyncTime}`);
      return { success: true };

    } catch (err) {
      this.isConnected = false;
      this._retryDelay = Math.min(this._retryDelay * 2, this._MAX_DELAY);
      log.debug('Sync failed:', err.message);
      return { success: false, reason: 'offline' };
    }
  }

  async _register(serverUrl, headers, userName) {
    try {
      await fetch(`${serverUrl}/api/sync/register`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: userName }),
      });
    } catch {}
  }

  async _syncTasks(serverUrl, headers, userName) {
    const tasks = this.db.prepare(
      'SELECT * FROM tasks WHERE synced = 0 AND end_time IS NOT NULL LIMIT 100'
    ).all();
    if (!tasks.length) return;

    const res = await fetch(`${serverUrl}/api/sync/tasks`, {
      method: 'POST', headers,
      body: JSON.stringify({ tasks, userName }),
    });

    if (res.ok) {
      const ids = tasks.map(t => t.task_id);
      const ph  = ids.map(() => '?').join(',');
      this.db.prepare(`UPDATE tasks SET synced = 1 WHERE task_id IN (${ph})`).run(...ids);
      log.info('Synced tasks:', tasks.length);
    }
  }

  async _syncActivity(serverUrl, headers) {
    const rows = this.db.prepare(
      'SELECT * FROM activity_logs WHERE synced = 0 LIMIT 500'
    ).all();
    if (!rows.length) return;

    const res = await fetch(`${serverUrl}/api/sync/activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity: rows }),
    });

    if (res.ok) {
      const ids = rows.map(r => r.activity_id);
      const ph  = ids.map(() => '?').join(',');
      this.db.prepare(`UPDATE activity_logs SET synced = 1 WHERE activity_id IN (${ph})`).run(...ids);
      log.info('Synced activity rows:', rows.length);
    }
  }
}

module.exports = SyncService;
