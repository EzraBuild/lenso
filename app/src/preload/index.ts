import { contextBridge, ipcRenderer } from 'electron'

const api = {
  ensureReceiver: (): Promise<'ok' | 'started' | 'no-venv' | 'failed'> => ipcRenderer.invoke('receiver:ensure'),
  quit: (): Promise<void> => ipcRenderer.invoke('receiver:quit'),
  root: (): Promise<string> => ipcRenderer.invoke('app:root')
}

contextBridge.exposeInMainWorld('icam', api)

export type IcamApi = typeof api
