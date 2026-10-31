/* Electron main process: opens the control window and makes sure the Python
   receiver (server/main.py) is running behind it. */
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import { existsSync, openSync } from 'fs'
import { join, resolve } from 'path'

const BASE = 'http://127.0.0.1:8080'
// repo root: app/ lives inside the lenso folder (also when packaged next to it)
const ROOT = process.env.LENSO_ROOT ?? (app.isPackaged ? resolve(process.resourcesPath, '..', '..') : resolve(app.getAppPath(), '..'))

let startedByUs = false

async function alive(timeoutMs = 800): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(`${BASE}/api/status`, { signal: ctrl.signal })
    clearTimeout(t)
    return r.ok
  } catch {
    return false
  }
}

function receiverCommand(): { exe: string; args: string[]; cwd: string } | null {
  if (app.isPackaged) {
    // installed build: PyInstaller bundle shipped in resources/receiver
    const exe = join(process.resourcesPath, 'receiver', 'lenso-receiver.exe')
    return existsSync(exe) ? { exe, args: [], cwd: join(process.resourcesPath, 'receiver') } : null
  }
  const pyw = join(ROOT, '.venv', 'Scripts', 'pythonw.exe')
  const py = join(ROOT, '.venv', 'Scripts', 'python.exe')
  const exe = existsSync(pyw) ? pyw : py
  return existsSync(exe) ? { exe, args: [join(ROOT, 'server', 'main.py')], cwd: ROOT } : null
}

function startReceiver(): boolean {
  const rc = receiverCommand()
  if (!rc) return false
  const logDir = app.isPackaged ? app.getPath('userData') : ROOT
  const log = openSync(join(logDir, 'receiver.log'), 'a')
  const child = spawn(rc.exe, rc.args, {
    cwd: rc.cwd,
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true
  })
  child.unref()
  startedByUs = true
  return true
}

async function ensureReceiver(): Promise<'ok' | 'started' | 'no-venv' | 'failed'> {
  if (await alive()) return 'ok'
  if (!startReceiver()) return 'no-venv'
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500))
    if (await alive()) return 'started'
  }
  return 'failed'
}

async function stopReceiver(): Promise<void> {
  try {
    await fetch(`${BASE}/api/quit`, { method: 'POST' })
  } catch {
    /* already gone */
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#000000',
    title: 'Lenso',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#000000', symbolColor: '#fafafa', height: 40 },
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
  })
  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

app.whenReady().then(async () => {
  ipcMain.handle('receiver:ensure', () => ensureReceiver())
  ipcMain.handle('receiver:quit', async () => {
    await stopReceiver()
    app.quit()
  })
  ipcMain.handle('app:root', () => ROOT)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  // closing the window stops the receiver too, but only if this app started it
  if (startedByUs) await stopReceiver()
  app.quit()
})
