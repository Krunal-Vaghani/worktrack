const { v4: uuidv4 } = require('uuid');

class TaskRepo {
  constructor(db) { this.db = db; }

  create(data) {
    const id = data.task_id || uuidv4();
    this.db.prepare(`
      INSERT INTO tasks (task_id, user_id, task_name, start_time)
      VALUES (?, ?, ?, ?)
    `).run(id, data.user_id, data.task_name, data.start_time);
    return this.getById(id);
  }

  getById(id) {
    return this.db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(id);
  }

  update(id, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    this.db.prepare(`UPDATE tasks SET ${fields} WHERE task_id = ?`).run(...Object.values(data), id);
  }

  getByUserAndDate(userId, date) {
    return this.db.prepare(`
      SELECT * FROM tasks
      WHERE user_id = ? AND date(start_time) = ?
      ORDER BY start_time DESC
    `).all(userId, date);
  }

  getAllByDate(date) {
    return this.db.prepare(`
      SELECT t.*, u.name as user_name FROM tasks t
      LEFT JOIN users u ON t.user_id = u.user_id
      WHERE date(t.start_time) = ?
      ORDER BY t.start_time DESC
    `).all(date);
  }

  getUnfinished(userId) {
    return this.db.prepare(`SELECT * FROM tasks WHERE user_id = ? AND end_time IS NULL`).all(userId);
  }

  getDailySummary(userId, date) {
    return this.db.prepare(`
      SELECT
        COUNT(*) as task_count,
        SUM(total_duration)  as total_seconds,
        SUM(active_duration) as active_seconds,
        SUM(idle_duration)   as idle_seconds,
        AVG(productivity_score) as avg_score
      FROM tasks
      WHERE user_id = ? AND date(start_time) = ? AND end_time IS NOT NULL
    `).get(userId, date);
  }

  getUnsyncedTasks() {
    return this.db.prepare('SELECT * FROM tasks WHERE synced = 0 AND end_time IS NOT NULL').all();
  }

  markSynced(ids) {
    const p = ids.map(() => '?').join(',');
    this.db.prepare(`UPDATE tasks SET synced = 1 WHERE task_id IN (${p})`).run(...ids);
  }
}

module.exports = TaskRepo;
