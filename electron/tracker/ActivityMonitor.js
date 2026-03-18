/**
 * ActivityMonitor
 * Uses GetForegroundWindow Win32 API via PowerShell C# to get the
 * actual focused window. Filters out the WorkTrack app itself.
 * Pre-compiles the C# type on startup so polling stays fast.
 */
const { exec } = require('child_process');
const log = require('electron-log');

// These process names are WorkTrack itself — skip them
const SELF_PROCESSES = new Set([
  'worktrack', 'electron', 'worktrack.exe', 'electron.exe'
]);

// Pre-compiled C# inline type — gets the foreground window accurately
const PS_FOREGROUND = String.raw`powershell -NoProfile -NonInteractive -Command "Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Text;
public class FW {
  [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();
  [DllImport(\"user32.dll\")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
  [DllImport(\"user32.dll\", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int m);
  public static string GetInfo() {
    IntPtr hwnd = GetForegroundWindow();
    int pid; GetWindowThreadProcessId(hwnd, out pid);
    StringBuilder sb = new StringBuilder(512);
    GetWindowText(hwnd, sb, 512);
    try {
      Process p = Process.GetProcessById(pid);
      return p.ProcessName + \"|\" + sb.ToString();
    } catch { return \"unknown|\" + sb.ToString(); }
  }
}
'@ -Language CSharp; [FW]::GetInfo()"`;

// Fallback — no C# compilation needed, uses Get-Process with MainWindowHandle check
const PS_FALLBACK = `powershell -NoProfile -NonInteractive -Command "$h=(Add-Type '[DllImport(\\\"user32\\\"\")]public static extern IntPtr GetForegroundWindow();' -Name U -PassThru)::GetForegroundWindow(); $p=Get-Process | Where-Object {$_.MainWindowHandle -eq $h}; if($p){$p.ProcessName+'|'+$p.MainWindowTitle}else{'unknown|'}"`;

// Simplest fallback — just gets the topmost non-background process
const PS_SIMPLE = `powershell -NoProfile -NonInteractive -Command "$p=Get-Process | Where-Object {$_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' -and $_.ProcessName -notmatch 'WorkTrack|electron'} | Sort-Object CPU -Descending | Select-Object -First 1; if($p){$p.ProcessName+'|'+$p.MainWindowTitle}else{'unknown|'}"`;

// Map Windows process names → friendly display names for categorization
const PROCESS_MAP = {
  // Browsers
  'chrome':           'Chrome',
  'msedge':           'Edge',
  'firefox':          'Firefox',
  'brave':            'Brave',
  'opera':            'Opera',
  'vivaldi':          'Vivaldi',
  'arc':              'Arc',
  // IDEs & Editors
  'code':             'VS Code',
  'devenv':           'Visual Studio',
  'pycharm64':        'PyCharm',
  'pycharm':          'PyCharm',
  'idea64':           'IntelliJ IDEA',
  'idea':             'IntelliJ IDEA',
  'webstorm64':       'WebStorm',
  'webstorm':         'WebStorm',
  'rider64':          'Rider',
  'goland64':         'GoLand',
  'clion64':          'CLion',
  'datagrip64':       'DataGrip',
  'sublime_text':     'Sublime Text',
  'notepad++':        'Notepad++',
  'atom':             'Atom',
  'cursor':           'Cursor',
  'windsurf':         'Windsurf',
  'zed':              'Zed',
  // Terminals
  'windowsterminal':  'Windows Terminal',
  'cmd':              'Command Prompt',
  'powershell':       'PowerShell',
  'pwsh':             'PowerShell',
  'wt':               'Windows Terminal',
  'alacritty':        'Alacritty',
  'wezterm-gui':      'WezTerm',
  'hyper':            'Hyper',
  // Communication
  'slack':            'Slack',
  'teams':            'Microsoft Teams',
  'msteams':          'Microsoft Teams',
  'zoom':             'Zoom',
  'discord':          'Discord',
  'webex':            'Webex',
  'loom':             'Loom',
  'outlook':          'Outlook',
  // Office
  'winword':          'Microsoft Word',
  'excel':            'Microsoft Excel',
  'powerpnt':         'PowerPoint',
  'onenote':          'OneNote',
  // Design
  'figma':            'Figma',
  'xd':               'Adobe XD',
  'photoshop':        'Photoshop',
  'illustrator':      'Illustrator',
  'indesign':         'InDesign',
  'afterfx':          'After Effects',
  'premiere':         'Premiere Pro',
  'blender':          'Blender',
  'inkscape':         'Inkscape',
  // Dev tools
  'postman':          'Postman',
  'insomnia':         'Insomnia',
  'docker desktop':   'Docker Desktop',
  'docker':           'Docker',
  'tableplus':        'TablePlus',
  'dbeaver':          'DBeaver',
  // System / Neutral
  'explorer':         'File Explorer',
  'notepad':          'Notepad',
  'mspaint':          'Paint',
  'calc':             'Calculator',
  // Entertainment (non-work)
  'spotify':          'Spotify',
  'vlc':              'VLC',
  'steam':            'Steam',
};

class ActivityMonitor {
  constructor(db, activityRepo, categorizer) {
    this.db           = db;
    this.activityRepo = activityRepo;
    this.categorizer  = categorizer;
    this.currentTask  = null;
    this.pollInterval = null;
    this.currentApp   = null;
    this.currentTitle = null;
    this.appStartTime = null;
    this.isIdle       = false;
    this.onWindowChange = null;
    this._mode        = 'simple'; // start with simple, upgrade to compiled
    this._compileReady = false;
    this._tryCompile();
  }

  // Try to pre-compile the C# type once at startup
  _tryCompile() {
    exec(PS_FOREGROUND, { timeout: 10000 }, (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        this._mode = 'compiled';
        this._compileReady = true;
        log.info('ActivityMonitor: compiled PS mode ready');
      } else {
        log.warn('ActivityMonitor: using simple PS fallback');
        this._mode = 'simple';
      }
    });
  }

  start(task) {
    this.currentTask  = task;
    this.appStartTime = Date.now();
    this.isIdle       = false;
    this.currentApp   = null;
    this.currentTitle = null;
    this.pollInterval = setInterval(() => this._poll(), 2000);
    log.info('ActivityMonitor started for task:', task.task_id);
  }

  stop() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    this._flushCurrentSegment();
    this.currentTask = null;
    log.info('ActivityMonitor stopped');
  }

  setIdle(isIdle) {
    if (this.isIdle !== isIdle) {
      this._flushCurrentSegment();
      this.isIdle       = isIdle;
      this.appStartTime = Date.now();
    }
  }

  _poll() {
    if (!this.currentTask) return;
    const cmd = this._mode === 'compiled' ? PS_FOREGROUND : PS_SIMPLE;
    exec(cmd, { timeout: 2500 }, (err, stdout) => {
      if (err || !stdout?.trim()) return;
      this._handleResult(stdout.trim());
    });
  }

  _handleResult(raw) {
    const pipe  = raw.indexOf('|');
    const rawProc  = (pipe > -1 ? raw.slice(0, pipe) : raw).trim().toLowerCase().replace(/\.exe$/i, '');
    const rawTitle = (pipe > -1 ? raw.slice(pipe + 1) : '').trim();

    // Skip blank or unknown
    if (!rawProc || rawProc === 'unknown') return;

    // Skip WorkTrack / Electron itself
    if (SELF_PROCESSES.has(rawProc) || rawProc.includes('worktrack') || rawProc.includes('electron')) return;

    // Map to display name
    const displayName = PROCESS_MAP[rawProc] || 
                        (rawProc.charAt(0).toUpperCase() + rawProc.slice(1));

    if (displayName !== this.currentApp || rawTitle !== this.currentTitle) {
      this._flushCurrentSegment();
      this.currentApp   = displayName;
      this.currentTitle = rawTitle;
      this.appStartTime = Date.now();

      const category = this.categorizer.categorize(displayName, rawTitle);
      log.debug(`FG window: "${displayName}" | cat:${category} | title:${rawTitle.slice(0,50)}`);

      if (this.onWindowChange) {
        this.onWindowChange({ appName: displayName, windowTitle: rawTitle, category, isIdle: this.isIdle });
      }
    }
  }

  _flushCurrentSegment() {
    if (!this.currentTask || !this.currentApp) return;
    const duration = Math.floor((Date.now() - (this.appStartTime || Date.now())) / 1000);
    if (duration < 1) return;
    try {
      const category = this.categorizer.categorize(this.currentApp, this.currentTitle || '');
      this.activityRepo.create({
        task_id:          this.currentTask.task_id,
        timestamp:        new Date().toISOString(),
        application_name: this.currentApp,
        window_title:     this.currentTitle || '',
        duration,
        idle_flag: this.isIdle ? 1 : 0,
        category
      });
    } catch (err) {
      log.error('Flush segment error:', err.message);
    }
  }
}

module.exports = ActivityMonitor;
