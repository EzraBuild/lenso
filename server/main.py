"""lenso receiver: serves the phone web app over HTTPS, receives the WebRTC
stream, decodes it and pushes frames into the 'lenso' virtual webcam."""
import argparse
import asyncio
import json
import logging
import os
import pathlib
import ssl
import sys
import time

from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.rtcrtpsender import RTCRtpSender

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from certs import ensure_certs, lan_ips  # noqa: E402
from picture import Picture, thumbnail, to_png  # noqa: E402
from vcam import VirtualCamera  # noqa: E402

# Source checkout: everything lives in the repo folder. Installed build (PyInstaller):
# the exe sits in resources/receiver, web/ next to it, and writable data goes to %LOCALAPPDATA%\Lenso.
FROZEN = bool(getattr(sys, "frozen", False))
ROOT = pathlib.Path(sys.executable).resolve().parent if FROZEN else pathlib.Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
DATA_DIR = pathlib.Path(os.environ.get("LOCALAPPDATA", str(ROOT))) / "Lenso" if FROZEN else ROOT
CERT_DIR = DATA_DIR / "certs"
SETTINGS_FILE = DATA_DIR / "settings.json"

log = logging.getLogger("lenso")


class NullCamera:
    """Stand-in used when the virtual webcam filter is not registered yet."""
    size = None

    def send(self, rgb):
        self.size = (rgb.shape[1], rgb.shape[0])

    def standby(self):
        pass

    def close(self):
        pass


class State:
    def __init__(self, vcam: VirtualCamera, picture: Picture):
        self.vcam = vcam
        self.picture = picture
        self.preview = None          # small copy of the last output frame, for the control app
        self.ips: list[str] = []
        self.ports: dict = {}
        self.quit = asyncio.Event()
        self.pc: RTCPeerConnection | None = None
        self.phone_ws: web.WebSocketResponse | None = None
        self.phone_status: dict = {}
        self.frames = 0
        self.dropped = 0
        self.fps = 0.0
        self._fps_window_start = time.monotonic()
        self._fps_window_frames = 0
        self.connected_since: float | None = None

    def tick_frame(self):
        self.frames += 1
        self._fps_window_frames += 1
        now = time.monotonic()
        if now - self._fps_window_start >= 1.0:
            self.fps = self._fps_window_frames / (now - self._fps_window_start)
            self._fps_window_start = now
            self._fps_window_frames = 0

    async def close_pc(self):
        if self.pc is not None:
            pc, self.pc = self.pc, None
            await pc.close()
        self.connected_since = None
        self.fps = 0.0


# ---------------------------------------------------------------- WebRTC

async def consume_video(track, state: State):
    loop = asyncio.get_running_loop()
    log.info("video track started")
    dropped = 0
    try:
        while True:
            frame = await track.recv()
            # If decoding fell behind, skip straight to the newest frame instead of
            # building up a backlog: a dropped frame is better than growing delay.
            queue = getattr(track, "_queue", None)
            while queue is not None and not queue.empty():
                newer = queue.get_nowait()
                if newer is None:
                    break
                frame = newer
                dropped += 1
                state.dropped = dropped
            # colour conversion + copy into shared memory happens off the event loop
            await loop.run_in_executor(None, _push_frame, frame, state)
    except Exception as exc:  # noqa: BLE001  (MediaStreamError on hangup is normal)
        log.info("video track ended: %s", exc.__class__.__name__)


def _push_frame(frame, state: State):
    rgb = state.picture.apply(frame.to_ndarray(format="rgb24"), tilt=state.phone_status.get("tilt"))
    state.vcam.send(rgb)
    state.preview = thumbnail(rgb)
    state.tick_frame()


async def handle_offer(request: web.Request):
    state: State = request.app["state"]
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    await state.close_pc()
    pc = RTCPeerConnection()
    state.pc = pc

    @pc.on("connectionstatechange")
    async def on_state():
        log.info("peer connection: %s", pc.connectionState)
        if pc.connectionState == "connected":
            state.connected_since = time.time()
        elif pc.connectionState in ("failed", "closed", "disconnected"):
            if state.pc is pc:
                await state.close_pc()

    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            asyncio.ensure_future(consume_video(track, state))

    await pc.setRemoteDescription(offer)

    # Prefer H.264: the iPhone encodes it in hardware, so the phone stays cool.
    caps = RTCRtpSender.getCapabilities("video")
    h264 = [c for c in caps.codecs if c.mimeType == "video/H264"]
    rest = [c for c in caps.codecs if c.mimeType != "video/H264"]
    for t in pc.getTransceivers():
        if t.kind == "video":
            t.setCodecPreferences(h264 + rest)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return web.json_response({"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})


async def handle_hangup(request: web.Request):
    await request.app["state"].close_pc()
    return web.json_response({"ok": True})


# ---------------------------------------------------------------- control channel

async def handle_ws(request: web.Request):
    """The phone keeps this socket open: it reports status, we send commands."""
    state: State = request.app["state"]
    ws = web.WebSocketResponse(heartbeat=15)
    await ws.prepare(request)
    if state.phone_ws is not None and not state.phone_ws.closed:
        await state.phone_ws.close()
    state.phone_ws = ws
    log.info("phone control channel connected from %s", request.remote)
    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                state.phone_status = json.loads(msg.data)
            except json.JSONDecodeError:
                pass
    if state.phone_ws is ws:
        state.phone_ws = None
        state.phone_status = {}
    log.info("phone control channel closed")
    return ws


async def handle_cmd(request: web.Request):
    """POST /api/cmd with JSON. Examples:
      {"zoom": 2}  {"camera": "ultrawide"}  {"resolution": "1920x1080"}
      {"fps": 60}  {"bitrate": 12}  {"torch": true}  {"action": "start"} / {"action": "stop"}
    Anything you can tap in the phone UI can be sent here. That is the scripting hook."""
    state: State = request.app["state"]
    if state.phone_ws is None or state.phone_ws.closed:
        return web.json_response({"ok": False, "error": "phone not connected"}, status=409)
    body = await request.json()
    await state.phone_ws.send_str(json.dumps(body))
    return web.json_response({"ok": True, "sent": body})


async def handle_status(request: web.Request):
    state: State = request.app["state"]
    return web.json_response({
        "phone_connected": state.phone_ws is not None and not state.phone_ws.closed,
        "streaming": state.pc is not None and state.pc.connectionState == "connected",
        "connected_since": state.connected_since,
        "receiver_fps": round(state.fps, 1),
        "frames_total": state.frames,
        "frames_dropped_for_latency": state.dropped,
        "vcam_size": state.vcam.size,
        "picture": state.picture.settings,
        "rotate_effective": state.picture.effective_rotate,
        "ips": state.ips,
        "ports": state.ports,
        "phone": state.phone_status,
    })


async def handle_picture(request: web.Request):
    """GET returns the PC-side picture settings; POST JSON updates them. Keys:
    rotate (0/90/180/270), mirror (bool), flip (bool), fit (native/letterbox/crop)."""
    state: State = request.app["state"]
    if request.method == "POST":
        state.picture.update(await request.json())
    return web.json_response(state.picture.settings)


async def handle_preview(request: web.Request):
    """Latest output frame, downscaled, as PNG (what the control window shows)."""
    state: State = request.app["state"]
    frame = state.preview
    if frame is None or not (state.pc is not None and state.pc.connectionState == "connected"):
        return web.Response(status=204)
    png = await asyncio.get_running_loop().run_in_executor(None, to_png, frame)
    return web.Response(body=png, content_type="image/png", headers={"Cache-Control": "no-store"})


async def handle_quit(request: web.Request):
    """Control window's Quit button: stop the receiver process cleanly."""
    request.app["state"].quit.set()
    return web.json_response({"ok": True})


CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"}


@web.middleware
async def no_cache(request: web.Request, handler):
    """No stale pages on the phone, and CORS so the Electron control app can call the API."""
    if request.method == "OPTIONS":
        return web.Response(status=204, headers=CORS)
    resp = await handler(request)
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers.update(CORS)
    return resp


# ---------------------------------------------------------------- static / CA

async def handle_ca(request: web.Request):
    return web.FileResponse(
        CERT_DIR / "ca.crt",
        headers={"Content-Type": "application/x-x509-ca-cert",
                 "Content-Disposition": 'attachment; filename="lenso-ca.crt"'},
    )


def http_setup_page(ips: list[str], https_port: int) -> str:
    link = f"https://{ips[0]}:{https_port}/" if ips else "https://<pc-ip>:8443/"
    return f"""<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1">
<title>lenso setup</title>
<style>body{{font-family:-apple-system,system-ui;background:#0e0e11;color:#eee;padding:24px;max-width:520px;margin:auto;line-height:1.5}}
a.btn{{display:block;background:#4f8cff;color:#fff;text-decoration:none;padding:14px;border-radius:12px;text-align:center;font-weight:600;margin:14px 0}}
code{{background:#222;padding:2px 6px;border-radius:6px}} ol li{{margin:10px 0}}</style></head><body>
<h1>lenso &middot; one-time setup</h1>
<ol>
<li><a class=btn href="/ca.crt">1. Download certificate</a> Tap <b>Allow</b> when Safari asks.</li>
<li>Open <b>Settings</b> &rarr; <b>Profile Downloaded</b> (top of Settings) &rarr; <b>Install</b>.</li>
<li>Then <b>Settings &rarr; General &rarr; About &rarr; Certificate Trust Settings</b> &rarr; turn on <b>lenso Local CA</b>.</li>
<li><a class=btn href="{link}">2. Open the camera app</a> then Share &rarr; <b>Add to Home Screen</b>.</li>
</ol>
<p>PC address: <code>{', '.join(ips) or 'unknown'}</code></p>
</body></html>"""


async def app_index(_):
    return web.FileResponse(WEB_DIR / "index.html")


def add_app_routes(app: web.Application, state: State):
    app["state"] = state
    app.router.add_post("/offer", handle_offer)
    app.router.add_post("/hangup", handle_hangup)
    app.router.add_get("/ws", handle_ws)
    app.router.add_post("/api/cmd", handle_cmd)
    app.router.add_get("/api/status", handle_status)
    app.router.add_get("/api/picture", handle_picture)
    app.router.add_post("/api/picture", handle_picture)
    app.router.add_get("/api/preview.png", handle_preview)
    app.router.add_post("/api/quit", handle_quit)
    app.router.add_get("/ca.crt", handle_ca)
    app.router.add_get("/app", app_index)
    app.router.add_static("/", WEB_DIR, show_index=False)


def make_https_app(state: State) -> web.Application:
    app = web.Application(middlewares=[no_cache])
    app.router.add_get("/", app_index)
    add_app_routes(app, state)
    return app


def make_http_app(state: State, ips: list[str], https_port: int) -> web.Application:
    """Plain HTTP: the certificate setup page for the phone. It also exposes the app at
    /app, which only works from the PC itself (browsers treat http://localhost as secure)."""
    app = web.Application(middlewares=[no_cache])

    async def setup(_):
        return web.Response(text=http_setup_page(ips, https_port), content_type="text/html")

    app.router.add_get("/", setup)
    add_app_routes(app, state)
    return app


async def standby_loop(state: State):
    while not state.quit.is_set():
        try:
            if state.pc is None or state.pc.connectionState != "connected":
                state.vcam.standby()
        except Exception as exc:  # noqa: BLE001
            log.warning("virtual camera unavailable: %s", exc)
            await asyncio.sleep(5)
            continue
        await asyncio.sleep(0.2)


async def amain(args):
    ips = lan_ips()
    if not ips:
        log.warning("no LAN IP found. Connect the PC to Wi-Fi first.")
    crt, key, _ = ensure_certs(CERT_DIR, ips)
    ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_ctx.load_cert_chain(str(crt), str(key))

    vcam = VirtualCamera(device=args.device, fps=args.fps)
    try:
        vcam.standby()
    except Exception as exc:  # noqa: BLE001
        log.error("virtual camera '%s' not available: %s", args.device, exc)
        log.error("Reinstall Lenso (or run install-camera.cmd once as admin) and restart. "
                  "Running anyway so you can do the phone setup; frames are received but not shown.")
        vcam = NullCamera()
    state = State(vcam, Picture(SETTINGS_FILE))
    state.ips = ips
    state.ports = {"http": args.http_port, "https": args.https_port}

    https_runner = web.AppRunner(make_https_app(state))
    http_runner = web.AppRunner(make_http_app(state, ips, args.https_port))
    await https_runner.setup()
    await http_runner.setup()
    await web.TCPSite(https_runner, "0.0.0.0", args.https_port, ssl_context=ssl_ctx).start()
    await web.TCPSite(http_runner, "0.0.0.0", args.http_port).start()

    print()
    print("  lenso receiver running")
    for ip in ips:
        print(f"    first time on the phone :  http://{ip}:{args.http_port}/")
        print(f"    camera app              :  https://{ip}:{args.https_port}/")
    print(f"    virtual webcam name     :  {args.device}")
    print(f"    scripting               :  POST https://localhost:{args.https_port}/api/cmd")
    print("    control window          :  control.cmd")
    print("  Ctrl+C to stop")
    print()

    try:
        await standby_loop(state)
    finally:
        await state.close_pc()
        vcam.close()
        await https_runner.cleanup()
        await http_runner.cleanup()


def main():
    p = argparse.ArgumentParser(description="lenso receiver")
    p.add_argument("--https-port", type=int, default=8443)
    p.add_argument("--http-port", type=int, default=8080)
    p.add_argument("--fps", type=int, default=30, help="virtual camera nominal fps")
    p.add_argument("--device", default="lenso", help="virtual camera name registered by install-camera.cmd")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if sys.stdout is not None:
        sys.stdout.reconfigure(line_buffering=True)  # banner shows up even when output is piped
    log_kwargs = {"filename": str(DATA_DIR / "receiver.log")} if FROZEN or sys.stdout is None else {}
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(name)s %(levelname)s %(message)s", datefmt="%H:%M:%S", **log_kwargs)
    logging.getLogger("aioice").setLevel(logging.WARNING)
    logging.getLogger("aiohttp.access").setLevel(logging.WARNING)
    try:
        asyncio.run(amain(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
