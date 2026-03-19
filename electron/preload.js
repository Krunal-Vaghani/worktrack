const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('worktrack', {
  // Auth
  login:      (userId, password) => ipcRenderer.invoke('auth-login', { userId, password }),
  logout:     ()                 => ipcRenderer.invoke('auth-logout'),
  authCheck:  ()                 => ipcRenderer.invoke('auth-check'),

  // State & tasks
  getState:        ()           => ipcRenderer.invoke('get-state'),
  startTask:       (name)       => ipcRenderer.invoke('start-task', { taskName: name }),
  stopTask:        ()           => ipcRenderer.invoke('stop-task'),
  getTasks:        (date)       => ipcRenderer.invoke('get-tasks', { date }),
  getActivity:     (taskId)     => ipcRenderer.invoke('get-activity', { taskId }),
  getDailySummary: ()           => ipcRenderer.invoke('get-daily-summary'),

  // Admin — employees
  adminGetAllEmployees:   ()                         => ipcRenderer.invoke('admin-get-all-employees'),
  adminCreateEmployee:    (name, role)               => ipcRenderer.invoke('admin-create-employee', { name, role }),
  adminUpdateEmployee:    (userId, name, role, pw)   => ipcRenderer.invoke('admin-update-employee', { userId, name, role, password: pw }),
  adminResetPassword:     (userId)                   => ipcRenderer.invoke('admin-reset-password', { userId }),
  adminToggleAccess:      (userId, disabled)         => ipcRenderer.invoke('admin-toggle-access', { userId, disabled }),
  adminDeleteEmployee:    (userId)                   => ipcRenderer.invoke('admin-delete-employee', { userId }),
  adminGetEmployeeTasks:  (userId, date)             => ipcRenderer.invoke('admin-get-employee-tasks', { userId, date }),
  adminGetAllTasks:       (date)                     => ipcRenderer.invoke('admin-get-all-tasks', { date }),

  // Settings
  getSettings:     ()         => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s)        => ipcRenderer.invoke('save-settings', s),
  getSyncStatus:   ()         => ipcRenderer.invoke('get-sync-status'),
  triggerSync:     ()         => ipcRenderer.invoke('trigger-sync'),

  // Events main → renderer
  onActiveWindowChanged: (cb) => { ipcRenderer.on('active-window-changed', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('active-window-changed'); },
  onIdleStatusChanged:   (cb) => { ipcRenderer.on('idle-status-changed',   (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('idle-status-changed'); },
  onTaskStopped:         (cb) => { ipcRenderer.on('task-stopped',          (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('task-stopped'); },
  onSettingsChanged:     (cb) => { ipcRenderer.on('settings-changed',       ()    => cb());  return () => ipcRenderer.removeAllListeners('settings-changed'); },
});
