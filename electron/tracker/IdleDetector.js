/**
 * IdleDetector
 * Detects user inactivity via Windows GetLastInputInfo (PowerShell).
 * Falls back to mouse-position comparison on non-Windows.
 */

const { exec } = require('child_process');
const log = require('electron-log');

class IdleDetector {
  constructor(thresholdSeconds = 300) {
    this.threshold = thresholdSeconds;
    this.isIdle = false;
    this.onIdleChange = null; // callback(isIdle: boolean)
    this._interval = null;
    this._lastMousePos = null;
    this._noMoveCount = 0;
    this._isWindows = process.platform === 'win32';
  }

  start() {
    this._interval = setInterval(() => this._check(), 10000); // check every 10s
    log.info('IdleDetector started, threshold:', this.threshold, 's');
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  setThreshold(seconds) {
    this.threshold = seconds;
  }

  resetIdle() {
    if (this.isIdle) {
      this.isIdle = false;
      if (this.onIdleChange) this.onIdleChange(false);
    }
  }

  async _check() {
    try {
      const idleSeconds = await this._getIdleSeconds();
      const shouldBeIdle = idleSeconds >= this.threshold;

      if (shouldBeIdle !== this.isIdle) {
        this.isIdle = shouldBeIdle;
        log.info(`Idle state → ${this.isIdle} (idle for ${idleSeconds}s)`);
        if (this.onIdleChange) this.onIdleChange(this.isIdle);
      }
    } catch (err) {
      log.debug('IdleDetector check error:', err.message);
    }
  }

  _getIdleSeconds() {
    if (this._isWindows) {
      return this._getWindowsIdleSeconds();
    }
    return this._getFallbackIdleSeconds();
  }

  _getWindowsIdleSeconds() {
    return new Promise((resolve, reject) => {
      // Uses GetLastInputInfo via PowerShell to get system idle time
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class IdleTime {
            [DllImport("user32.dll")]
            static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
            [StructLayout(LayoutKind.Sequential)]
            struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
            public static uint GetIdleMilliseconds() {
              var info = new LASTINPUTINFO();
              info.cbSize = (uint)Marshal.SizeOf(info);
              if (!GetLastInputInfo(ref info)) return 0;
              return (uint)Environment.TickCount - info.dwTime;
            }
          }
"@
        [IdleTime]::GetIdleMilliseconds()
      `.replace(/\n/g, ' ');

      exec(`powershell -Command "${script}"`, { timeout: 3000 }, (err, stdout) => {
        if (err) return reject(err);
        const ms = parseInt(stdout.trim());
        resolve(isNaN(ms) ? 0 : Math.floor(ms / 1000));
      });
    });
  }

  _getFallbackIdleSeconds() {
    // On non-Windows: use robot.js or simple mouse position comparison
    return new Promise((resolve) => {
      try {
        const robot = require('robotjs');
        const pos = robot.getMousePos();
        if (this._lastMousePos &&
            pos.x === this._lastMousePos.x &&
            pos.y === this._lastMousePos.y) {
          this._noMoveCount++;
          resolve(this._noMoveCount * 10); // 10s per check interval
        } else {
          this._noMoveCount = 0;
          this._lastMousePos = pos;
          resolve(0);
        }
      } catch {
        resolve(0);
      }
    });
  }
}

module.exports = IdleDetector;
