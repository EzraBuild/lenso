/* Talks to the Python receiver's local API. */
import { useEffect, useRef, useState } from 'react'

export const BASE = 'http://127.0.0.1:8080'

export type Camera = { kind: string; label: string }
export type PhoneStatus = {
  live?: boolean
  streaming?: boolean
  camera?: string | null
  camera_kind?: string | null
  cameras?: Camera[]
  requested?: { camera?: string; resolution?: string; fps?: number; bitrate?: number }
  actual?: { width?: number; height?: number; fps?: number }
  zoom?: number | null
  zoom_range?: { min: number; max: number; step: number } | null
  torch?: boolean | null
  tilt?: number | null
  tilt_permission?: string
  width?: number
  height?: number
  fps?: number
  mbps?: number
  limited?: string | null
}
export type Picture = { rotate: 'auto' | number; mirror: boolean; flip: boolean; fit: 'native' | 'letterbox' | 'crop' }
export type Status = {
  phone_connected: boolean
  streaming: boolean
  receiver_fps: number
  frames_total: number
  vcam_size: [number, number] | null
  picture: Picture
  rotate_effective: number
  ips: string[]
  ports: { http: number; https: number }
  phone: PhoneStatus
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}
export const cmd = (body: Record<string, unknown>): Promise<Response> => post('/api/cmd', body)
export const picture = (body: Partial<Picture>): Promise<Response> => post('/api/picture', body)

export type Link = 'connecting' | 'online' | 'offline'

/** Polls /api/status twice a second. */
export function useStatus(intervalMs = 500): { status: Status | null; link: Link } {
  const [status, setStatus] = useState<Status | null>(null)
  const [link, setLink] = useState<Link>('connecting')
  useEffect(() => {
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async (): Promise<void> => {
      try {
        const r = await fetch(`${BASE}/api/status`, { cache: 'no-store' })
        if (!stop) {
          setStatus((await r.json()) as Status)
          setLink('online')
        }
      } catch {
        if (!stop) setLink((l) => (l === 'connecting' ? 'connecting' : 'offline'))
      }
      if (!stop) timer = setTimeout(tick, intervalMs)
    }
    tick()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [intervalMs])
  return { status, link }
}

/** Pulls preview frames while streaming; returns an object URL for an <img>. */
export function usePreview(active: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!active) {
      if (last.current) URL.revokeObjectURL(last.current)
      last.current = null
      setUrl(null)
      return
    }
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async (): Promise<void> => {
      let delay = 300
      try {
        const r = await fetch(`${BASE}/api/preview.png`, { cache: 'no-store' })
        if (r.status === 200 && !stop) {
          const next = URL.createObjectURL(await r.blob())
          if (last.current) URL.revokeObjectURL(last.current)
          last.current = next
          setUrl(next)
          delay = 66
        }
      } catch {
        /* status poll reports it */
      }
      if (!stop) timer = setTimeout(tick, delay)
    }
    tick()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [active])
  return url
}
