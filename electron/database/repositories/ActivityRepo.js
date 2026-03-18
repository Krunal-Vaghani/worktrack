const { v4: uuidv4 } = require('uuid');

class ActivityRepo {
  // db is the Database instance from db.js — use db.prepare() directly
  constructor(db) { this.db = db; }

  create(data) {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO activity_logs
        (activity_id, task_id, timestamp, application_name, window_title, duration, idle_flag, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.task_id, data.timestamp, data.application_name,
           data.window_title || '', data.duration, data.idle_flag || 0, data.category || 'neutral');
    return id;
  }

  getByTask(taskId) {
    return this.db.prepare(`
      SELECT * FROM activity_logs WHERE task_id = ? ORDER BY timestamp ASC
    `).all(taskId);
  }

  getAppSummaryForTask(taskId) {
    return this.db.prepare(`
      SELECT application_name, category, SUM(duration) as total_duration
      FROM activity_logs
      WHERE task_id = ? AND idle_flag = 0
      GROUP BY application_name
      ORDER BY total_duration DESC
    `).all(taskId);
  }

  getUnsynced() {
    return this.db.prepare('SELECT * FROM activity_logs WHERE synced = 0').all();
  }

  markSynced(ids) {
    const placeholders = ids.map(() => '?').join(',');
    this.db.prepare(`UPDATE activity_logs SET synced = 1 WHERE activity_id IN (${placeholders})`).run(...ids);
  }
}

module.exports = { ActivityRepo };
