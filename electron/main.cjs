const { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn, exec } = require('child_process')

nativeTheme.themeSource = 'dark'

const isDev = process.env.NODE_ENV === 'development'
const userDataPath = app.getPath('userData')
const soundsDir = path.join(userDataPath, 'sounds')
const settingsFile = path.join(userDataPath, 'settings.json')
const soundsMetaFile = path.join(userDataPath, 'sounds-meta.json')

if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true })

let mainWindow
let registeredHotkeys = new Map()
let stopAllAccelerator = null
let pttKey = 'V'
let pttMode = 'hold'
let pttActive = false  // guard: prevent stuck key spam

// ── Window ─────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 600,
    frame: false, backgroundColor: '#080810',
    icon: path.join(__dirname, '../resources/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => {
  releasePTT()
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})
app.on('will-quit', () => { releasePTT(); globalShortcut.unregisterAll() })

// ── Window Controls ────────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize())
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

// ── File System ────────────────────────────────────────────────────────────────
ipcMain.handle('sounds:getDir', () => soundsDir)

ipcMain.handle('sounds:getMeta', () => {
  try { if (fs.existsSync(soundsMetaFile)) return JSON.parse(fs.readFileSync(soundsMetaFile, 'utf8')) }
  catch (e) {}
  return []
})

ipcMain.handle('sounds:saveMeta', (_, meta) => {
  fs.writeFileSync(soundsMetaFile, JSON.stringify(meta, null, 2))
  return true
})

ipcMain.handle('sounds:importFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Audio Files', defaultPath: os.homedir(),
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (result.canceled) return null
  return copyFiles(result.filePaths)
})

ipcMain.handle('sounds:dropFiles', async (_, filePaths) => {
  const valid = filePaths.filter(p => {
    const ext = path.extname(p).toLowerCase().slice(1)
    return ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm'].includes(ext)
  })
  return copyFiles(valid)
})

function copyFiles(srcPaths) {
  const imported = []
  for (const srcPath of srcPaths) {
    if (!fs.existsSync(srcPath)) continue
    const filename = path.basename(srcPath)
    let finalDest = path.join(soundsDir, filename)
    let counter = 1
    while (fs.existsSync(finalDest)) {
      const ext = path.extname(filename)
      const base = path.basename(filename, ext)
      finalDest = path.join(soundsDir, `${base}_${counter}${ext}`)
      counter++
    }
    fs.copyFileSync(srcPath, finalDest)
    imported.push({ original: srcPath, dest: finalDest, name: path.basename(finalDest) })
  }
  return imported
}

ipcMain.handle('sounds:delete', (_, filename) => {
  const p = path.join(soundsDir, filename)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  return true
})

ipcMain.handle('sounds:getFilePath', (_, filename) => path.join(soundsDir, filename))

// ── Settings ───────────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => {
  try { if (fs.existsSync(settingsFile)) return JSON.parse(fs.readFileSync(settingsFile, 'utf8')) }
  catch (e) {}
  return {}
})
ipcMain.handle('settings:save', (_, s) => { fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2)); return true })

// ── Hotkeys ────────────────────────────────────────────────────────────────────
ipcMain.handle('hotkeys:register', (_, { id, accelerator }) => {
  try {
    if (registeredHotkeys.has(id)) {
      try { globalShortcut.unregister(registeredHotkeys.get(id)) } catch (e) {}
      registeredHotkeys.delete(id)
    }
    if (!accelerator) return { success: true }
    const ok = globalShortcut.register(accelerator, () => {
      mainWindow?.webContents.send('hotkey:triggered', id)
    })
    if (ok) { registeredHotkeys.set(id, accelerator); return { success: true } }
    return { success: false, error: 'Hotkey conflict or invalid' }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('hotkeys:unregister', (_, id) => {
  if (registeredHotkeys.has(id)) {
    try { globalShortcut.unregister(registeredHotkeys.get(id)) } catch (e) {}
    registeredHotkeys.delete(id)
  }
  return true
})

ipcMain.handle('hotkeys:unregisterAll', () => {
  globalShortcut.unregisterAll()
  registeredHotkeys.clear()
  stopAllAccelerator = null
  return true
})

ipcMain.handle('hotkeys:registerStopAll', (_, accelerator) => {
  try {
    if (stopAllAccelerator) {
      try { globalShortcut.unregister(stopAllAccelerator) } catch (e) {}
      stopAllAccelerator = null
    }
    if (!accelerator) return { success: true }
    const ok = globalShortcut.register(accelerator, () => {
      mainWindow?.webContents.send('hotkey:stopAll')
    })
    if (ok) { stopAllAccelerator = accelerator; return { success: true } }
    return { success: false, error: 'Hotkey conflict' }
  } catch (e) { return { success: false, error: e.message } }
})

// ── PTT Simulation (Safe Windows keyboard simulation) ─────────────────────────
// Uses Windows SendInput via PowerShell - exactly like a physical key press.
// Does NOT inject into any game. Does NOT interact with anti-cheat.

const VK_MAP = {
  'V': 0x56, 'B': 0x42, 'N': 0x4E, 'M': 0x4D, 'C': 0x43, 'X': 0x58,
  'Z': 0x5A, 'F1': 0x70, 'F2': 0x71, 'F3': 0x72, 'F4': 0x73,
  'F5': 0x74, 'F6': 0x75, 'F7': 0x76, 'F8': 0x77, 'F9': 0x78, 'F10': 0x79,
  'F11': 0x7A, 'F12': 0x7B, 'CapsLock': 0x14, 'Tab': 0x09,
  'Space': 0x20, 'Enter': 0x0D, 'Escape': 0x1B,
  '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34, '5': 0x35,
  '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39, '0': 0x30,
  'Numpad0': 0x60, 'Numpad1': 0x61, 'Numpad2': 0x62, 'Numpad3': 0x63,
}

function getVK(keyName) {
  if (!keyName) return null
  const k = keyName.replace('Control', '').replace('Alt', '').replace('Shift', '').replace('+', '').trim()
  return VK_MAP[k] ?? null
}

const PTT_PS = (vk, release) => `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeySim {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@ -ErrorAction SilentlyContinue
[KeySim]::keybd_event(${vk}, 0, ${release ? 2 : 0}, [UIntPtr]::Zero)
`

function pressPTT() {
  if (pttActive || !pttKey) return
  const vk = getVK(pttKey)
  if (!vk) return
  pttActive = true
  exec(`powershell -NoProfile -NonInteractive -Command "${PTT_PS(vk, false).replace(/\n/g, ' ')}"`, () => {})
}

function releasePTT() {
  if (!pttActive || !pttKey) return
  const vk = getVK(pttKey)
  if (!vk) return
  pttActive = false
  exec(`powershell -NoProfile -NonInteractive -Command "${PTT_PS(vk, true).replace(/\n/g, ' ')}"`, () => {})
}

ipcMain.handle('ptt:setKey', (_, key) => { pttKey = key || 'V'; return true })
ipcMain.handle('ptt:getKey', () => pttKey)
ipcMain.handle('ptt:setMode', (_, mode) => { pttMode = mode; return true })
ipcMain.handle('ptt:press', () => { pressPTT(); return true })
ipcMain.handle('ptt:release', () => { releasePTT(); return true })

// ── Virtual Audio Devices ──────────────────────────────────────────────────────
ipcMain.handle('audio:listDevices', async () => {
  return new Promise((resolve) => {
    const ps = `
Get-WmiObject Win32_SoundDevice | Select-Object Name | ConvertTo-Json
`
    exec(`powershell -NoProfile -Command "${ps.trim()}"`, (err, stdout) => {
      if (err) { resolve([]); return }
      try {
        const raw = JSON.parse(stdout)
        const arr = Array.isArray(raw) ? raw : [raw]
        resolve(arr.map(d => d.Name).filter(Boolean))
      } catch (e) { resolve([]) }
    })
  })
})

// ── yt-dlp ─────────────────────────────────────────────────────────────────────
ipcMain.handle('ytdlp:checkInstalled', async () => {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', ['--version'], { shell: true })
    let version = ''
    proc.stdout?.on('data', d => { version += d.toString() })
    proc.on('close', code => resolve({ installed: code === 0, version: version.trim() }))
    proc.on('error', () => resolve({ installed: false, version: '' }))
  })
})

ipcMain.handle('ytdlp:getInfo', async (_, url) => {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', ['--dump-json', '--no-playlist', url], { shell: true })
    let stdout = '', stderr = ''
    proc.stdout?.on('data', d => { stdout += d.toString() })
    proc.stderr?.on('data', d => { stderr += d.toString() })
    proc.on('close', code => {
      if (code !== 0) { resolve({ success: false, error: stderr || 'yt-dlp failed' }); return }
      try {
        const info = JSON.parse(stdout)
        resolve({ success: true, title: info.title, duration: info.duration, thumbnail: info.thumbnail, uploader: info.uploader, url })
      } catch (e) { resolve({ success: false, error: 'Parse error' }) }
    })
    proc.on('error', e => resolve({ success: false, error: `yt-dlp not found: ${e.message}` }))
  })
})

ipcMain.handle('ytdlp:download', async (event, { url, name, startSec, endSec }) => {
  return new Promise((resolve) => {
    const safeName = (name || 'clip').replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 60)
    const outTemplate = path.join(soundsDir, `${safeName}.%(ext)s`)
    const args = ['--no-playlist', '-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outTemplate]
    if (startSec !== undefined || endSec !== undefined) {
      args.push('--download-sections', `*${startSec || 0}-${endSec || 'inf'}`, '--force-keyframes-at-cuts')
    }
    args.push(url)

    const proc = spawn('yt-dlp', args, { shell: true })
    proc.stdout?.on('data', d => mainWindow?.webContents.send('ytdlp:progress', d.toString()))
    proc.stderr?.on('data', d => mainWindow?.webContents.send('ytdlp:progress', d.toString()))
    proc.on('close', code => {
      const expectedPath = path.join(soundsDir, `${safeName}.mp3`)
      const altPath = path.join(soundsDir, `${safeName}.mp3`)
      if (code !== 0 && !fs.existsSync(expectedPath)) {
        resolve({ success: false, error: 'Download failed' }); return
      }
      const finalPath = fs.existsSync(expectedPath) ? expectedPath : altPath
      resolve({ success: true, dest: finalPath, name: path.basename(finalPath) })
    })
    proc.on('error', e => resolve({ success: false, error: e.message }))
  })
})

// ── Shell / App ────────────────────────────────────────────────────────────────
ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPlatform', () => process.platform)
