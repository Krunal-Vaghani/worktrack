/**
 * WorkTrack — Electron Main Process
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell } = require('electron');
const path   = require('path');
const log    = require('electron-log');
const Store  = require('electron-store');

const Database       = require('./database/db');
const ActivityMonitor = require('./tracker/ActivityMonitor');
const IdleDetector   = require('./tracker/IdleDetector');
const ScreenshotService = require('./tracker/ScreenshotService');
const AppCategorizer = require('./tracker/AppCategorizer');
const SyncService    = require('./sync/SyncService');
const TaskRepo       = require('./database/repositories/TaskRepo');
const { ActivityRepo } = require('./database/repositories/ActivityRepo');
const UserRepo       = require('./database/repositories/UserRepo');

// ── Single instance lock ──────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
});

// ── Config store ──────────────────────────────────────────────────────────────
const store = new Store({
  encryptionKey: 'worktrack-local-key-2025',
  schema: {
    userId:            { type: 'string',  default: '' },
    userName:          { type: 'string',  default: '' },
    userRole:          { type: 'string',  default: '' },
    serverUrl:         { type: 'string',  default: 'https://worktrack-production-599c.up.railway.app' },
    idleThreshold:     { type: 'number',  default: 300 },
    screenshotEnabled: { type: 'boolean', default: false },
    screenshotInterval:{ type: 'number',  default: 600 },
    autoStart:         { type: 'boolean', default: true },
    minimizeToTray:    { type: 'boolean', default: true },
    syncToken:         { type: 'string',  default: 'mycompany-sync-2025' },
  }
});

log.transports.file.level = 'info';

// ── Globals ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray       = null;
let db = null, activityMonitor = null, idleDetector = null;
let screenshotService = null, syncService = null;
let taskRepo = null, activityRepo = null, userRepo = null;
let currentTask  = null;
let isQuitting   = false;
let isLoggedIn   = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const RENDERER_URL = isDev
  ? 'http://localhost:5173'
  : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await initDatabase();
    createWindow();
    createTray();
    setupIPC();
    setupAutoLaunch();
    log.info('WorkTrack ready');
  } catch (err) {
    log.error('Startup error:', err);
    dialog.showErrorBox('WorkTrack Error', `Failed to start: ${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin' && isQuitting) app.quit(); });
app.on('before-quit', () => { isQuitting = true; });
app.on('activate', () => { if (!mainWindow) createWindow(); });

// ── Database ──────────────────────────────────────────────────────────────────
async function initDatabase() {
  db          = new Database(app.getPath('userData'));
  await db.initialize();
  taskRepo    = new TaskRepo(db);
  activityRepo = new ActivityRepo(db);
  userRepo    = new UserRepo(db);

  // Ensure admin account exists with a valid password
  // This runs on every startup to fix any broken admin rows from old schema
  userRepo.ensureAdmin();
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440, height: 640, minWidth: 380, minHeight: 560,
    title: 'WorkTrack', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    icon: path.join(__dirname, '../build/assets/icon.ico')
  });
  mainWindow.loadURL(RENDERER_URL);
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  mainWindow.on('close', e => {
    if (!isQuitting && store.get('minimizeToTray')) { e.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  try {
    const iconPath = path.join(__dirname, '../build/assets/tray.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  } catch { tray = new Tray(nativeImage.createEmpty()); }
  tray.setToolTip('WorkTrack');
  updateTrayMenu();
  tray.on('click', () => { if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); } else createWindow(); });
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'WorkTrack', enabled: false },
    { type: 'separator' },
    { label: currentTask ? `Tracking: ${currentTask.task_name.slice(0,28)}` : 'No active task', enabled: false },
    { type: 'separator' },
    { label: 'Open', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; if (currentTask) stopCurrentTask().finally(() => app.quit()); else app.quit(); } }
  ]));
}

// ── Services ──────────────────────────────────────────────────────────────────
function initServices() {
  const categorizer = new AppCategorizer();
  activityMonitor   = new ActivityMonitor(db, activityRepo, categorizer);
  idleDetector      = new IdleDetector(store.get('idleThreshold'));
  screenshotService = new ScreenshotService(db, app.getPath('userData'));
  syncService       = new SyncService(db, store);

  idleDetector.onIdleChange = (isIdle) => {
    activityMonitor.setIdle(isIdle);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('idle-status-changed', { isIdle });
  };
  activityMonitor.onWindowChange = (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('active-window-changed', info);
  };

  idleDetector.start();
  syncService.start();
}

// ── IPC ───────────────────────────────────────────────────────────────────────
function setupIPC() {

  // ── AUTH ──────────────────────────────────────────────────────────────────

  ipcMain.handle('auth-login', async (_, { userId, password }) => {
    const user = userRepo.authenticate(userId.trim(), password);
    if (!user) return { success: false, error: 'Invalid User ID or password' };
    store.set('userId',   user.user_id);
    store.set('userName', user.name);
    store.set('userRole', user.role);
    isLoggedIn = true;
    if (!activityMonitor) initServices();
    // Recover any unfinished tasks
    const unfinished = taskRepo.getUnfinished(user.user_id);
    for (const t of unfinished) {
      const end = new Date().toISOString();
      const dur = Math.floor((Date.now() - new Date(t.start_time).getTime()) / 1000);
      taskRepo.update(t.task_id, { end_time: end, total_duration: dur, active_duration: dur, idle_duration: 0, productivity_score: 100 });
    }
    return { success: true, user: { user_id: user.user_id, name: user.name, role: user.role } };
  });

  ipcMain.handle('auth-logout', async () => {
    if (currentTask) await stopCurrentTask();
    store.set('userId',   '');
    store.set('userName', '');
    store.set('userRole', '');
    isLoggedIn = false;
    return { success: true };
  });

  ipcMain.handle('auth-check', async () => {
    const userId = store.get('userId');
    const role   = store.get('userRole');
    if (!userId || !role) return { loggedIn: false };
    const user = userRepo.getById(userId);
    if (!user) return { loggedIn: false };
    if (!isLoggedIn) { isLoggedIn = true; if (!activityMonitor) initServices(); }
    return { loggedIn: true, user: { user_id: user.user_id, name: user.name, role: user.role } };
  });

  // ── STATE ──────────────────────────────────────────────────────────────────

  ipcMain.handle('get-state', async () => ({
    userId:      store.get('userId'),
    userName:    store.get('userName'),
    userRole:    store.get('userRole'),
    serverUrl:   store.get('serverUrl'),
    idleThreshold: store.get('idleThreshold'),
    screenshotEnabled: store.get('screenshotEnabled'),
    currentTask,
    isConnected: syncService?.isConnected || false
  }));

  // ── TASKS ──────────────────────────────────────────────────────────────────

  ipcMain.handle('start-task', async (_, { taskName }) => {
    try {
      if (currentTask) await stopCurrentTask();
      const task = taskRepo.create({ user_id: store.get('userId'), task_name: taskName.trim(), start_time: new Date().toISOString() });
      if (!task) return { success: false, error: 'Failed to create task in database' };
      currentTask = task;
      activityMonitor.start(task);
      idleDetector.resetIdle();
      if (store.get('screenshotEnabled')) screenshotService.start(task, store.get('screenshotInterval'));
      updateTrayMenu();
      return { success: true, task };
    } catch (err) {
      log.error('start-task:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('stop-task', async () => {
    try {
      const summary = await stopCurrentTask();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('task-stopped', summary);
      return { success: true, summary };
    } catch (err) {
      log.error('stop-task:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-tasks', async (_, { date } = {}) => {
    const userId = store.get('userId');
    const role   = store.get('userRole');
    if (!userId) return [];
    if (role === 'admin') {
      // Admin sees all employees' tasks
      return taskRepo.getAllByDate(date || new Date().toISOString().split('T')[0]);
    }
    return taskRepo.getByUserAndDate(userId, date || new Date().toISOString().split('T')[0]);
  });

  ipcMain.handle('get-activity', async (_, { taskId }) => activityRepo.getByTask(taskId));

  ipcMain.handle('get-daily-summary', async () => {
    const userId = store.get('userId');
    const today  = new Date().toISOString().split('T')[0];
    return taskRepo.getDailySummary(userId, today);
  });

  // ── ADMIN: USER MANAGEMENT ─────────────────────────────────────────────────

  ipcMain.handle('admin-get-employees', async () => {
    return userRepo.getEmployees();
  });

  ipcMain.handle('admin-create-employee', async (_, { name, role }) => {
    if (!name?.trim()) return { success: false, error: 'Name is required' };
    const result = userRepo.createWithCredentials(name.trim(), role || 'employee', null);
    if (result.error) return { success: false, error: result.error };
    return { success: true, employee: result };
  });

  ipcMain.handle('admin-reset-password', async (_, { userId }) => {
    const user = userRepo.getById(userId);
    if (!user) return { success: false, error: 'User not found' };
    const pw = userRepo._generatePassword();
    userRepo.updatePassword(userId, pw);
    return { success: true, userId, newPassword: pw };
  });

  ipcMain.handle('admin-update-employee', async (_, { userId, name, role, password }) => {
    if (name)     userRepo.updateName(userId, name);
    if (role)     userRepo.db.prepare('UPDATE users SET role = ? WHERE user_id = ?').run(role, userId);
    if (password) userRepo.updatePassword(userId, password);
    return { success: true, employee: userRepo.getById(userId) };
  });

  ipcMain.handle('admin-toggle-access', async (_, { userId, disabled }) => {
    userRepo.db.prepare('UPDATE users SET disabled = ? WHERE user_id = ?').run(disabled ? 1 : 0, userId);
    return { success: true };
  });

  ipcMain.handle('admin-get-all-employees', async () => {
    return userRepo.getAll();
  });

  ipcMain.handle('admin-delete-employee', async (_, { userId }) => {
    userRepo.delete(userId);
    return { success: true };
  });

  ipcMain.handle('admin-get-employee-tasks', async (_, { userId, date }) => {
    return taskRepo.getByUserAndDate(userId, date || new Date().toISOString().split('T')[0]);
  });

  ipcMain.handle('admin-get-all-tasks', async (_, { date } = {}) => {
    return taskRepo.getAllByDate(date || new Date().toISOString().split('T')[0]);
  });

  // ── SETTINGS ───────────────────────────────────────────────────────────────

  ipcMain.handle('get-settings', async () => ({
    idleThreshold:     store.get('idleThreshold'),
    screenshotEnabled: store.get('screenshotEnabled'),
    screenshotInterval:store.get('screenshotInterval'),
    serverUrl:         store.get('serverUrl'),
    syncToken:         store.get('syncToken'),
    autoStart:         store.get('autoStart'),
    minimizeToTray:    store.get('minimizeToTray'),
  }));

  ipcMain.handle('save-settings', async (_, settings) => {
    Object.entries(settings).forEach(([k, v]) => store.set(k, v));
    if (idleDetector && settings.idleThreshold) idleDetector.setThreshold(settings.idleThreshold);
    if (settings.autoStart !== undefined) app.setLoginItemSettings({ openAtLogin: settings.autoStart, openAsHidden: true });
    return { success: true };
  });

  ipcMain.handle('trigger-sync', async () => syncService?.syncNow() || { success: false });

  ipcMain.handle('get-sync-status', async () => ({
    isConnected:  syncService?.isConnected || false,
    pendingCount: syncService?.getPendingCount() || 0,
    lastSync:     syncService?.lastSyncTime || null,
  }));
}

// ── Stop task ─────────────────────────────────────────────────────────────────
async function stopCurrentTask() {
  if (!currentTask) return null;
  const saved = { ...currentTask }; // snapshot before clearing

  const endTime = new Date().toISOString();
  activityMonitor.stop();
  screenshotService.stop();

  const activities     = activityRepo.getByTask(saved.task_id);
  const totalDuration  = Math.max(1, Math.floor((new Date(endTime) - new Date(saved.start_time)) / 1000));

  // idle_flag is stored as integer 0/1 by sql.js - cast explicitly
  const idleEntries    = activities.filter(a => Number(a.idle_flag) === 1);
  const idleDuration   = idleEntries.reduce((sum, a) => sum + (Number(a.duration) || 0), 0);
  const activeDuration = Math.max(0, totalDuration - idleDuration);

  // If no activity logged at all (e.g. very short task or PS didn't fire yet)
  // → assume 100% active. Otherwise compute from logged data.
  const productivityScore = activities.length === 0
    ? 100
    : Math.min(100, Math.max(0, Math.round((activeDuration / totalDuration) * 100)));

  log.info(`stopTask: total=${totalDuration}s active=${activeDuration}s idle=${idleDuration}s score=${productivityScore}% activities=${activities.length}`);

  taskRepo.update(saved.task_id, {
    end_time:          endTime,
    total_duration:    totalDuration,
    active_duration:   activeDuration,
    idle_duration:     idleDuration,
    productivity_score: productivityScore
  });

  const summary = {
    task:              saved,
    totalDuration,
    activeDuration,
    idleDuration,
    productivityScore,
    appBreakdown:      buildAppBreakdown(activities)
  };

  log.info(`Task stopped: ${saved.task_name} | ${totalDuration}s total | score:${productivityScore}%`);
  currentTask = null;
  updateTrayMenu();
  syncService?.syncNow().catch(() => {});
  return summary;
}

function buildAppBreakdown(activities) {
  const map = {};
  activities.forEach(a => {
    if (Number(a.idle_flag) !== 1) {
      const name = a.application_name || 'Unknown';
      map[name] = (map[name] || 0) + (Number(a.duration) || 0);
    }
  });
  return Object.entries(map).sort(([,a],[,b]) => b - a).map(([app, seconds]) => ({ app, seconds }));
}

// ── Auto-launch ───────────────────────────────────────────────────────────────
async function setupAutoLaunch() {
  try {
    app.setLoginItemSettings({ openAtLogin: store.get('autoStart'), openAsHidden: true, name: 'WorkTrack' });
  } catch (e) { log.warn('Auto-launch:', e.message); }
}
