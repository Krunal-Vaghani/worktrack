/**
 * Database — sql.js (pure WASM SQLite)
 *
 * Uses db.exec() for SELECT queries which returns:
 *   [{columns: ['col1','col2',...], values: [[v1,v2,...], ...]}]
 * This is the only 100% reliable way to get named columns from sql.js.
 *
 * Uses db.run(sql, params) for writes — also reliable.
 */
const path = require('path');
const fs   = require('fs');
const log  = require('electron-log');

/** Convert exec() result to array of plain objects */
function execToObjects(results) {
  if (!results || results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

class Database {
  constructor(userDataPath) {
    this.dbPath = path.join(userDataPath, 'worktrack.db');
    this.raw    = null;
    this._SQL   = null;
    this._dirty = false;
  }

  async initialize() {
    const initSqlJs = require('sql.js');
    const wasmPath  = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm');
    this._SQL = await initSqlJs({ locateFile: () => wasmPath });

    if (fs.existsSync(this.dbPath)) {
      this.raw = new this._SQL.Database(fs.readFileSync(this.dbPath));
      log.info('DB loaded from', this.dbPath);
    } else {
      this.raw = new this._SQL.Database();
      log.info('DB created at', this.dbPath);
    }

    this.raw.run('PRAGMA foreign_keys = ON;');
    this._runSchema();
    setInterval(() => { if (this._dirty) this._saveToDisk(); }, 3000);
    log.info('DB ready');
  }

  _runSchema() {
    // All columns defined here — no ALTER TABLE needed ever
    this.raw.run(`
      CREATE TABLE IF NOT EXISTS users (
        user_id     TEXT PRIMARY KEY,
        name        TEXT NOT NULL DEFAULT '',
        role        TEXT NOT NULL DEFAULT 'employee',
        password    TEXT,
        device_id   TEXT DEFAULT '',
        disabled    INTEGER DEFAULT 0,
        email       TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tasks (
        task_id            TEXT PRIMARY KEY,
        user_id            TEXT NOT NULL,
        task_name          TEXT NOT NULL,
        start_time         TEXT NOT NULL,
        end_time           TEXT,
        total_duration     INTEGER DEFAULT 0,
        active_duration    INTEGER DEFAULT 0,
        idle_duration      INTEGER DEFAULT 0,
        productivity_score REAL    DEFAULT 0,
        synced             INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
      CREATE TABLE IF NOT EXISTS activity_logs (
        activity_id      TEXT PRIMARY KEY,
        task_id          TEXT NOT NULL,
        timestamp        TEXT NOT NULL,
        application_name TEXT NOT NULL,
        window_title     TEXT DEFAULT '',
        duration         INTEGER NOT NULL DEFAULT 0,
        idle_flag        INTEGER DEFAULT 0,
        category         TEXT    DEFAULT 'neutral',
        synced           INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id)
      );
      CREATE TABLE IF NOT EXISTS screenshots (
        screenshot_id TEXT PRIMARY KEY,
        task_id       TEXT NOT NULL,
        timestamp     TEXT NOT NULL,
        image_path    TEXT NOT NULL,
        synced        INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, start_time);
      CREATE INDEX IF NOT EXISTS idx_act_task   ON activity_logs(task_id);
    `);
    // Safe migrations for existing DBs
    try { this.raw.run('ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0'); } catch {}
    try { this.raw.run('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
    this._saveToDisk();
  }

  /**
   * prepare(sql) — returns { get, all, run }
   * SELECT queries use exec() for reliable named-column results.
   * Write queries use run() directly.
   */
  prepare(sql) {
    const self       = this;
    const isWrite    = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql);

    return {
      /** Returns first matching row as plain object, or undefined */
      get(...params) {
        try {
          // Escape params into SQL directly for exec() which doesn't support ? params
          const finalSql = self._bindParams(sql, params);
          const results  = self.raw.exec(finalSql);
          const rows     = execToObjects(results);
          return rows[0] || undefined;
        } catch (e) {
          log.error('DB.get error:', e.message, '|', sql.slice(0, 80));
          return undefined;
        }
      },

      /** Returns all matching rows as array of plain objects */
      all(...params) {
        try {
          const finalSql = self._bindParams(sql, params);
          const results  = self.raw.exec(finalSql);
          return execToObjects(results);
        } catch (e) {
          log.error('DB.all error:', e.message, '|', sql.slice(0, 80));
          return [];
        }
      },

      /** Executes a write statement */
      run(...params) {
        try {
          self.raw.run(sql, params.length ? params : undefined);
          self._dirty = true;
          self._saveToDisk();
          return { changes: self.raw.getRowsModified() };
        } catch (e) {
          log.error('DB.run error:', e.message, '|', sql.slice(0, 80));
          return { changes: 0 };
        }
      }
    };
  }

  /**
   * Safely bind ? parameters into a SQL string for use with exec().
   * exec() in sql.js doesn't support parameterized queries, so we
   * escape values manually.
   */
  _bindParams(sql, params) {
    if (!params || params.length === 0) return sql;
    let i = 0;
    return sql.replace(/\?/g, () => {
      const val = params[i++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      // Escape single quotes in strings
      return `'${String(val).replace(/'/g, "''")}'`;
    });
  }

  exec(sql) {
    try {
      this.raw.run(sql);
      this._dirty = true;
      this._saveToDisk();
    } catch (e) {
      log.error('DB.exec error:', e.message);
    }
  }

  _saveToDisk() {
    try {
      if (!this.raw) return;
      fs.writeFileSync(this.dbPath, Buffer.from(this.raw.export()));
      this._dirty = false;
    } catch (e) {
      log.warn('DB save error:', e.message);
    }
  }

  close() {
    this._saveToDisk();
    if (this.raw) this.raw.close();
  }
}

module.exports = Database;
