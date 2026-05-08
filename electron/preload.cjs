const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Sounds
  getSoundsDir: () => ipcRenderer.invoke('sounds:getDir'),
  getSoundsMeta: () => ipcRenderer.invoke('sounds:getMeta'),
  saveSoundsMeta: (m) => ipcRenderer.invoke('sounds:saveMeta', m),
  importSoundFiles: () => ipcRenderer.invoke('sounds:importFile'),
  dropFiles: (p) => ipcRenderer.invoke('sounds:dropFiles', p),
  deleteSound: (f) => ipcRenderer.invoke('sounds:delete', f),
  getSoundFilePath: (f) => ipcRenderer.invoke('sounds:getFilePath', f),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  // Hotkeys
  registerHotkey: (d) => ipcRenderer.invoke('hotkeys:register', d),
  unregisterHotkey: (id) => ipcRenderer.invoke('hotkeys:unregister', id),
  unregisterAllHotkeys: () => ipcRenderer.invoke('hotkeys:unregisterAll'),
  onHotkeyTriggered: (cb) => ipcRenderer.on('hotkey:triggered', (_, id) => cb(id)),
  removeHotkeyListener: () => ipcRenderer.removeAllListeners('hotkey:triggered'),
  registerStopAllHotkey: (a) => ipcRenderer.invoke('hotkeys:registerStopAll', a),
  onStopAll: (cb) => ipcRenderer.on('hotkey:stopAll', () => cb()),
  removeStopAllListener: () => ipcRenderer.removeAllListeners('hotkey:stopAll'),

  // PTT — safe keyboard simulation only
  setPTTKey: (k) => ipcRenderer.invoke('ptt:setKey', k),
  getPTTKey: () => ipcRenderer.invoke('ptt:getKey'),
  setPTTMode: (m) => ipcRenderer.invoke('ptt:setMode', m),
  pressPTT: () => ipcRenderer.invoke('ptt:press'),
  releasePTT: () => ipcRenderer.invoke('ptt:release'),

  // Virtual Audio
  listAudioDevices: () => ipcRenderer.invoke('audio:listDevices'),

  // yt-dlp
  ytdlpCheckInstalled: () => ipcRenderer.invoke('ytdlp:checkInstalled'),
  ytdlpGetInfo: (url) => ipcRenderer.invoke('ytdlp:getInfo', url),
  ytdlpDownload: (opts) => ipcRenderer.invoke('ytdlp:download', opts),
  onYtdlpProgress: (cb) => ipcRenderer.on('ytdlp:progress', (_, msg) => cb(msg)),
  removeYtdlpProgressListener: () => ipcRenderer.removeAllListeners('ytdlp:progress'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
})
