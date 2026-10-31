import { useEffect, useRef, useState } from 'react'
import { Copy, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle, Field } from '@/components/ui/card'
import { Segmented } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { cmd, picture, usePreview, useStatus, type Picture } from '@/lib/api'
import { cn } from '@/lib/utils'

const CAMERAS = [
  { label: 'Front', value: 'front' },
  { label: 'Back', value: 'wide' },
  { label: 'Ultrawide', value: 'ultrawide' },
  { label: 'Telephoto', value: 'tele' }
]
const RESOLUTIONS = [
  { label: '720p', value: '1280x720' },
  { label: '1080p', value: '1920x1080' },
  { label: '2K', value: '2560x1440' },
  { label: '4K', value: '3840x2160' }
]
const FPS = [24, 30, 60].map((v) => ({ label: String(v), value: v }))
const BITRATES = [4, 6, 8, 12, 20, 35].map((v) => ({ label: String(v), value: v }))
const ROTATES: { label: string; value: Picture['rotate'] }[] = [
  { label: 'Auto', value: 'auto' },
  { label: '0°', value: 0 },
  { label: '90°', value: 90 },
  { label: '180°', value: 180 },
  { label: '270°', value: 270 }
]
const FITS: { label: string; value: Picture['fit'] }[] = [
  { label: 'Native', value: 'native' },
  { label: 'Letterbox 16:9', value: 'letterbox' },
  { label: 'Crop 16:9', value: 'crop' }
]

export default function App(): React.JSX.Element {
  const [boot, setBoot] = useState<string>('starting receiver')
  useEffect(() => {
    window.icam.ensureReceiver().then((r) => {
      if (r === 'no-venv') setBoot('python environment missing: run setup.cmd first')
      else if (r === 'failed') setBoot('receiver did not start, see receiver.log')
      else setBoot('')
    })
  }, [])

  const { status, link } = useStatus()
  const streaming = !!status?.streaming
  const phone = status?.phone ?? {}
  const pic = status?.picture
  const preview = usePreview(streaming)

  // zoom: local value while dragging so the poll doesn't fight the thumb
  const [zoomLocal, setZoomLocal] = useState<number | null>(null)
  const zoomSentAt = useRef(0)
  const zr = phone.zoom_range ?? null
  const zoom = zoomLocal ?? phone.zoom ?? (zr ? zr.min : 1)
  const sendZoom = (v: number, force: boolean): void => {
    const now = performance.now()
    if (force || now - zoomSentAt.current > 150) {
      zoomSentAt.current = now
      cmd({ zoom: Math.round(v * 100) / 100 })
    }
  }

  const [flash, setFlash] = useState<string>('')
  const say = (t: string): void => {
    setFlash(t)
    setTimeout(() => setFlash(''), 2200)
  }
  const send = (body: Record<string, unknown>): void => {
    cmd(body).then((r) => r.status === 409 && say('phone not connected')).catch(() => say('receiver not reachable'))
  }

  const state: { text: string; cls: string } =
    link === 'offline' || boot
      ? { text: boot || 'receiver offline', cls: 'bg-err' }
      : link === 'connecting'
        ? { text: 'connecting', cls: 'bg-zinc-700' }
        : streaming
          ? { text: 'streaming', cls: 'bg-ok' }
          : status?.phone_connected
            ? { text: 'phone connected', cls: 'bg-warn' }
            : { text: 'waiting for the phone', cls: 'bg-zinc-700' }

  const ips = status?.ips ?? []
  const ports = status?.ports ?? { http: 8080, https: 8443 }
  const appUrl = ips.length ? `https://${ips[0]}:${ports.https}/` : ''
  const setupUrl = ips.length ? `http://${ips[0]}:${ports.http}/` : ''

  const kinds = new Set((phone.cameras ?? []).map((c) => c.kind))
  const act = phone.actual ?? {}
  const vs = status?.vcam_size
  let stats = ''
  if (streaming && vs) {
    stats = `webcam ${vs[0]}×${vs[1]} · ${status?.receiver_fps} fps on PC`
    if (act.width) stats += ` · phone sends ${act.width}×${act.height} @ ${phone.fps ?? '?'} fps, ${phone.mbps ?? '?'} Mbps`
    if (phone.limited) stats += ` · limited by ${phone.limited}`
  }

  const needTap = pic?.rotate === 'auto' && status?.phone_connected && phone.tilt_permission && phone.tilt_permission !== 'granted'

  return (
    <div className="relative flex h-full flex-col">
      {/* title bar (draggable; native window buttons overlay the right end) */}
      <header className="drag flex h-10 shrink-0 items-center justify-between border-b border-border bg-black/80 pr-[150px] pl-5 backdrop-blur">
        <div className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 bg-foreground" />
          Lenso
        </div>
        <div className="no-drag flex items-center gap-2 border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted">
          <span className={cn('inline-block h-[7px] w-[7px]', state.cls)} />
          {state.text}
        </div>
      </header>

      <main className="grid flex-1 grid-cols-[minmax(0,1.2fr)_minmax(380px,1fr)] gap-3.5 overflow-auto p-5">
        {/* preview */}
        <Card className="sticky top-0 flex flex-col gap-3">
          <div className="relative aspect-video overflow-hidden border border-border bg-black">
            {preview ? (
              <img src={preview} alt="" className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <div className="absolute inset-0 grid place-items-center font-mono text-[12px] text-dim">
                {status?.phone_connected ? 'press start stream' : 'open the lenso app on the iphone'}
              </div>
            )}
          </div>
          <div className="min-h-[1.3em] font-mono text-[11.5px] text-muted">{flash || stats}</div>
          <Button
            size="lg"
            variant={streaming ? 'outline' : 'default'}
            disabled={!status?.phone_connected}
            onClick={() => send({ action: phone.live ? 'stop' : 'start' })}
          >
            {streaming || phone.live ? 'Stop stream' : 'Start stream'}
          </Button>

          <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
            <div className="flex min-w-0 flex-col gap-1.5 text-[13px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">Phone app</span>
                <code className="border border-border bg-card-2 px-2 py-1 font-mono text-[12px]">{appUrl || '…'}</code>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(appUrl).then(() => say('copied'))}>
                  <Copy className="h-3 w-3" /> copy
                </Button>
              </div>
              <div className="font-mono text-[11px] text-dim">
                first time on the phone: {setupUrl}
                {ips.length > 1 && ` · other pc addresses: ${ips.slice(1).join(', ')}`}
              </div>
            </div>
            <Button variant="ghost" onClick={() => window.icam.quit()} title="Stop the receiver and close">
              <Power className="h-3.5 w-3.5" /> Quit
            </Button>
          </div>
        </Card>

        {/* controls */}
        <aside className="flex flex-col gap-2.5">
          <Card>
            <CardTitle>Camera</CardTitle>
            <Segmented
              value={phone.camera_kind ?? null}
              options={CAMERAS.map((c) => ({ ...c, disabled: kinds.size > 0 && !kinds.has(c.value) }))}
              onChange={(v) => send({ camera: v })}
            />
          </Card>

          <Card>
            <CardTitle>Quality</CardTitle>
            <Field label="Resolution">
              <Segmented value={phone.requested?.resolution ?? null} options={RESOLUTIONS} onChange={(v) => send({ resolution: v })} />
            </Field>
            <Field label="Frame rate">
              <Segmented value={phone.requested?.fps ?? null} options={FPS} onChange={(v) => send({ fps: v })} />
            </Field>
            <Field label="Bitrate · Mbps">
              <Segmented value={phone.requested?.bitrate ?? null} options={BITRATES} onChange={(v) => send({ bitrate: v })} />
            </Field>
          </Card>

          <Card>
            <CardTitle>Lens</CardTitle>
            <Field label="Zoom" value={zr ? `${zoom.toFixed(1)}x` : streaming ? 'n/a' : '—'}>
              <Slider
                value={zoom}
                min={zr?.min ?? 1}
                max={zr?.max ?? 1}
                step={zr?.step ?? 0.1}
                disabled={!zr}
                onChange={(v) => {
                  setZoomLocal(v)
                  sendZoom(v, false)
                }}
                onCommit={(v) => {
                  sendZoom(v, true)
                  setTimeout(() => setZoomLocal(null), 600)
                }}
              />
            </Field>
            <Switch label="Torch" checked={!!phone.torch} disabled={phone.torch == null} onCheckedChange={(v) => send({ torch: v })} />
          </Card>

          <Card>
            <CardTitle hint="applied on the pc">Picture</CardTitle>
            <Field label="Rotate">
              <Segmented
                value={pic?.rotate ?? 'auto'}
                options={ROTATES.map((o) =>
                  o.value === 'auto' && pic?.rotate === 'auto' && streaming ? { ...o, label: `Auto (${status?.rotate_effective ?? 0}°)` } : o
                )}
                onChange={(v) => picture({ rotate: v })}
              />
            </Field>
            {needTap && (
              <p className="mb-2 text-[12px] leading-snug text-warn">
                {phone.tilt_permission === 'denied'
                  ? 'The phone refused motion access, so Auto cannot sense its tilt. Pick 90° or 270° by hand.'
                  : 'Tap the phone screen once so it can sense which way it is held (iOS asks for permission).'}
              </p>
            )}
            <div className="mb-2 grid grid-cols-2 gap-x-4">
              <Switch label="Mirror (selfie)" checked={!!pic?.mirror} onCheckedChange={(v) => picture({ mirror: v })} />
              <Switch label="Upside down" checked={!!pic?.flip} onCheckedChange={(v) => picture({ flip: v })} />
            </div>
            <Field label="Webcam frame">
              <Segmented value={pic?.fit ?? 'letterbox'} options={FITS} onChange={(v) => picture({ fit: v })} />
            </Field>
            <p className="mt-2 text-[12px] leading-snug text-dim">
              Letterbox keeps an upright phone picture inside a normal 16:9 webcam frame. Crop fills the frame instead.
            </p>
          </Card>
        </aside>
      </main>
    </div>
  )
}
