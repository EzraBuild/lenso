# Lenso

Use an iPhone as a webcam on Windows 11. No OBS, no watermark, no paid app, no Mac.

- Phone side: a web page you open in Safari (add to Home Screen, it behaves like an app).
  It shows nothing but the picture. The phone encodes H.264 in hardware and streams over
  your Wi-Fi via WebRTC.
- PC side: a control window (`control.cmd`) where you pick the camera, resolution, fps,
  bitrate, zoom, torch, rotation, mirror and framing, and see what the webcam is putting out.
  It is an Electron app (React + TypeScript, Tailwind, Geist). Behind it a small Python
  receiver (~100 MB RAM) decodes and pushes frames into a virtual webcam named **lenso**
  that Zoom, Teams, Discord, Chrome and OBS all see.
- Both devices just need to be on the same Wi-Fi. No hotspot, no internet needed.

## One-time setup (PC)

1. `setup.cmd`  creates the Python environment.
2. `install-camera.cmd`  registers the "lenso" virtual webcam (asks for admin once).
3. `control.cmd`  opens the control app (it starts the receiver by itself). The first run
   installs and builds the app, which needs Node.js and a few minutes; after that it is instant.
   The phone addresses are shown under the preview.

## One-time setup (iPhone)

1. In Safari open the **http** address shown in the control window (port 8080).
2. Tap **Download certificate**, then Settings → **Profile Downloaded** → Install.
3. Settings → General → About → **Certificate Trust Settings** → turn on *lenso Local CA*.
4. Open the **https** address (port 8443). Share → **Add to Home Screen**.

Safari only allows camera access on HTTPS, which is why the certificate step exists.
If your PC gets a new IP later the server re-issues its certificate automatically;
the CA you trusted stays valid.

## Daily use

Open `control.cmd` on the PC, open the lenso icon on the phone. It starts streaming on its own
(the round button stops/starts it; tap the screen to show or hide it). Pick **lenso** as the
camera in any app. Everything else is done from the PC. **Quit** in the window stops the receiver.

Tap the phone screen once after it opens: iOS asks for motion access, which lets the picture
stay upright automatically no matter how you hold the phone (see Rotate below).

## Control window

- **Camera**: Front, Back (wide), Ultrawide, Telephoto. Buttons grey out if the phone lacks one.
- **Quality**: resolution (720p / 1080p / 2K / 4K), fps (24 / 30 / 60), bitrate. 1080p30 at 8 Mbps
  is the sweet spot. 4K only works if iOS Safari hands out a 4K track on your iOS version.
- **Zoom** slider and **Torch** (ranges come from the phone, so they appear once it streams).
- **Picture (on the PC)**, applied to the frames before they reach the webcam, no phone restart:
  - **Rotate**: *Auto* (default) keeps the picture upright using the phone's motion sensor. This
    matters when the iPhone's Portrait Orientation Lock is on: iOS then sends a portrait frame
    even though you hold the phone sideways, and your head comes out tilted. Auto undoes that.
    0 / 90 / 180 / 270 are manual overrides.
  - **Mirror** (selfie look) and **Upside down**.
  - **Webcam frame**: *Letterbox 16:9* (default) places a portrait picture centred in a normal
    1920x1080 landscape frame (black bars at the sides, every app is happy); *Crop 16:9* cuts the
    picture to 16:9 instead and fills the frame; *Native* keeps whatever comes in.
  These are saved in `settings.json` and survive restarts.

`run.cmd` still starts the receiver alone (no window) if you only want the scripting API.
Developing the app: `cd app && npm run dev` gives hot reload.

## Scripting

Everything in the UI is reachable from the PC while the phone app is open:

```
curl -k -X POST https://localhost:8443/api/cmd -H "Content-Type: application/json" -d "{\"zoom\": 2}"
curl -k -X POST https://localhost:8443/api/cmd -d "{\"camera\": \"ultrawide\"}"
curl -k -X POST https://localhost:8443/api/cmd -d "{\"resolution\": \"3840x2160\", \"fps\": 30}"
curl -k -X POST https://localhost:8443/api/cmd -d "{\"action\": \"stop\"}"
curl -k https://localhost:8443/api/status
```

Keys: `action` (start/stop), `camera` (wide/back/ultrawide/tele/front), `resolution` (WxH), `fps`,
`bitrate` (Mbps), `zoom`, `torch`.

PC-side picture settings have their own endpoint:

```
curl -k -X POST https://localhost:8443/api/picture -d "{\"rotate\": 90, \"fit\": \"letterbox\"}"
curl -k -X POST https://localhost:8443/api/picture -d "{\"mirror\": true}"
curl -k https://localhost:8443/api/preview.png > frame.png      # latest output frame, small
curl -k -X POST https://localhost:8443/api/quit                  # stop the receiver
```

Keys: `rotate` (auto/0/90/180/270), `mirror`, `flip`, `fit` (native/letterbox/crop).

## Testing without the phone

`.venv\Scripts\python.exe tools\selftest.py` streams a synthetic 1080p30 H.264 feed into the running
receiver and prints the frame rate it decoded. The phone page is also served at
`http://localhost:8080/app` so you can open it in Chrome on the PC (browsers treat localhost as secure).

## Layout

```
app/                the control app (Electron + React + TypeScript + Tailwind)
  src/main/         Electron main process: window, starts/stops the Python receiver
  src/renderer/     the UI (App.tsx, shadcn-style components in components/ui)
server/main.py      HTTPS + WebRTC receiver + control API
server/picture.py   PC-side auto/manual rotate, mirror, flip, 16:9 framing, PNG preview
server/vcam.py      virtual camera wrapper (UnityCapture)
server/certs.py     local CA + server cert generation
web/                the phone app: full-screen preview only (index.html, app.js, style.css)
vendor/          UnityCapture DirectShow filter (MIT)
```

## Removing

`uninstall-camera.cmd` removes the virtual webcam. On the phone, delete the profile under
Settings → General → VPN & Device Management.
