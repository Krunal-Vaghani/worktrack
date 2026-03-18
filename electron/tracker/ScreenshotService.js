/**
 * ScreenshotService
 * Captures periodic screenshots, compresses to JPEG, stores path in DB.
 * Optional feature - disabled by default.
 */

const path = require('path');
const fs = require('fs');
const log = require('electron-log');

class ScreenshotService {
  constructor(db, userDataPath) {
    this.db = db;
    this.screenshotDir = path.join(userDataPath, 'screenshots');
    this.currentTask = null;
    this._interval = null;
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  start(task, intervalSeconds = 600) {
    this.currentTask = task;
    this._interval = setInterval(() => this._capture(), intervalSeconds * 1000);
    log.info('ScreenshotService started, interval:', intervalSeconds, 's');
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this.currentTask = null;
  }

  async _capture() {
    if (!this.currentTask) return;
    try {
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });

      if (sources.length === 0) return;

      const source = sources[0];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${this.currentTask.task_id}_${timestamp}.jpg`;
      const filePath = path.join(this.screenshotDir, fileName);

      // Convert NativeImage to JPEG buffer
      const buffer = source.thumbnail.toJPEG(70); // 70% quality
      fs.writeFileSync(filePath, buffer);

      // Store reference in DB
      this.db.prepare(`
        INSERT INTO screenshots (task_id, timestamp, image_path)
        VALUES (?, ?, ?)
      `).run(this.currentTask.task_id, new Date().toISOString(), filePath);

      log.info('Screenshot saved:', fileName);
    } catch (err) {
      log.error('Screenshot capture error:', err.message);
    }
  }
}

module.exports = ScreenshotService;
