const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'worktrack_salt_2025').digest('hex');
}

class UserRepo {
  constructor(db) { this.db = db; }

  /**
   * Called every startup. Forces the admin row to have the correct
   * password hash regardless of what state the DB is in.
   */
  ensureAdmin() {
    const log         = require('electron-log');
    const correctHash = hashPassword('admin123');

    // Add disabled column if missing (old DBs won't have it)
    try { this.db.prepare('ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0').run(); } catch {}

    // Check what's there
    const existing = this.db.prepare("SELECT * FROM users WHERE user_id = 'admin'").get();
    log.info('ensureAdmin: existing row:', JSON.stringify(existing));

    if (!existing) {
      // No admin row at all — insert fresh
      this.db.prepare(
        "INSERT INTO users (user_id, name, role, password, device_id, disabled) VALUES ('admin','Admin','admin',?,?,0)"
      ).run(correctHash, '');
      log.info('Admin inserted fresh. user=admin pass=admin123');

    } else {
      // Row exists — always force-update the password to the known correct hash
      // Use UPDATE with no WHERE on email to avoid unique constraint issues
      this.db.prepare(
        "UPDATE users SET password = ?, role = 'admin', disabled = 0 WHERE user_id = 'admin'"
      ).run(correctHash);
      log.info('Admin password force-updated to admin123 hash.');
    }

    // Verify
    const check = this.db.prepare("SELECT user_id, role, disabled, password FROM users WHERE user_id = 'admin'").get();
    const match = check?.password === correctHash;
    log.info(`Admin verify: found=${!!check} role=${check?.role} disabled=${check?.disabled} hashMatch=${match}`);
    if (!match) log.error('CRITICAL: admin password still wrong after update!');
  }

  create(data) {
    const id     = data.user_id || uuidv4();
    const pwHash = data.password ? hashPassword(data.password) : null;
    this.db.prepare(
      'INSERT OR IGNORE INTO users (user_id, name, role, password, device_id, disabled) VALUES (?,?,?,?,?,0)'
    ).run(id, data.name, data.role || 'employee', pwHash, data.device_id || '');
    return this.getById(id);
  }

  createWithCredentials(name, role, password) {
    // User ID = name exactly as entered (case-sensitive, unique)
    const id = name.trim();
    // Check uniqueness
    const existing = this.db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(id);
    if (existing) return { error: `User ID "${id}" already exists. Names must be unique.` };
    const pw = password || this._generatePassword();
    this.db.prepare(
      'INSERT INTO users (user_id, name, role, password, device_id, disabled) VALUES (?,?,?,?,?,0)'
    ).run(id, id, role || 'employee', hashPassword(pw), '');
    return { user_id: id, name: id, role: role || 'employee', plainPassword: pw };
  }

  authenticate(userId, password) {
    const log  = require('electron-log');
    const user = this.getById(userId.trim());

    if (!user) {
      log.warn(`authenticate: no row found for user_id="${userId}"`);
      return null;
    }
    log.info(`authenticate: found user="${user.user_id}" role="${user.role}" disabled=${user.disabled} hasPassword=${!!user.password}`);

    if (user.disabled == 1) {
      log.warn('authenticate: account is disabled');
      return null;
    }
    if (!user.password) {
      log.warn('authenticate: password field is null/empty');
      return null;
    }

    const expected = hashPassword(password);
    const match    = user.password === expected;
    log.info(`authenticate: hash match = ${match} | stored[0:16]=${user.password.slice(0,16)} | expected[0:16]=${expected.slice(0,16)}`);
    if (!match) return null;
    return user;
  }

  getById(userId) {
    return this.db.prepare(
      'SELECT user_id, name, role, password, device_id, disabled, email, created_at FROM users WHERE user_id = ?'
    ).get(userId);
  }

  getAll() {
    try {
      return this.db.prepare(
        'SELECT user_id, name, role, device_id, created_at, disabled FROM users ORDER BY role DESC, name ASC'
      ).all();
    } catch {
      return this.db.prepare('SELECT user_id, name, role, device_id FROM users ORDER BY role DESC, name ASC').all();
    }
  }

  getEmployees() {
    try {
      return this.db.prepare(
        "SELECT user_id, name, role, device_id, created_at, disabled FROM users WHERE role='employee' ORDER BY name"
      ).all();
    } catch {
      return this.db.prepare(
        "SELECT user_id, name, role FROM users WHERE role='employee' ORDER BY name"
      ).all();
    }
  }

  updateName(userId, name) {
    this.db.prepare('UPDATE users SET name = ? WHERE user_id = ?').run(name, userId);
  }

  updatePassword(userId, newPassword) {
    this.db.prepare('UPDATE users SET password = ? WHERE user_id = ?').run(hashPassword(newPassword), userId);
  }

  setDisabled(userId, disabled) {
    try { this.db.prepare('UPDATE users SET disabled = ? WHERE user_id = ?').run(disabled ? 1 : 0, userId); } catch {}
  }

  delete(userId) {
    this.db.prepare('DELETE FROM activity_logs WHERE task_id IN (SELECT task_id FROM tasks WHERE user_id = ?)').run(userId);
    this.db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
  }

  hasAdmins() {
    const row = this.db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get();
    return (row?.c || 0) > 0;
  }

  _generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }
}

module.exports = UserRepo;
