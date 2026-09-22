const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // System automation
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  openApp: (appName) => ipcRenderer.invoke('open-app', appName),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
  searchFiles: (searchTerm, searchPath) => ipcRenderer.invoke('search-files', searchTerm, searchPath),
  systemControl: (action) => ipcRenderer.invoke('system-control', action),
  pasteToApp: (appName, text) => ipcRenderer.invoke('paste-to-app', { appName, text }),
  saveDocument: (arg1, content, format) => typeof arg1 === 'object' ? ipcRenderer.invoke('save-document', arg1) : ipcRenderer.invoke('save-document', { title: arg1, content, format }),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  createFile: (arg1, content) => typeof arg1 === 'object' ? ipcRenderer.invoke('create-file', arg1) : ipcRenderer.invoke('create-file', { filePath: arg1, content }),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Paths and storage
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  
  // Environment
  getEnv: (key) => ipcRenderer.invoke('get-env', key),
  
  // Activity logging
  logActivity: (activity) => ipcRenderer.invoke('log-activity', activity),
  
  // Window Controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  
  // Platform info
  platform: process.platform
});
