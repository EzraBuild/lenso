/* lenso phone app. The phone shows only the picture; every setting is driven
   from the PC control app over the /ws socket (or POST /api/cmd). */
(() => {
  const $ = (id) => document.getElementById(id);
  const el = { preview: $("preview"), overlay: $("overlay"), dot: $("dot"), state: $("state"), start: $("start"), hint: $("hint") };

  const PREFS_KEY = "lenso.prefs.v2";   // v1 held strings and the old 2K/60/35 experiments
  const RESOLUTIONS = ["1280x720", "1920x1080", "2560x1440", "3840x2160"];
  const FPS = [24, 30, 60];

  // current settings (persisted). camera = deviceId
  const cfg = { camera: "", resolution: "1920x1080", fps: 30, bitrate: 8 };
  let cameras = [];       // [{id, label, kind}]
  let stream = null, track = null, pc = null, ws = null;
  let live = false, restarting = false, wakeLock = null;
  let statsTimer = null, wsRetry = 1000, lastBytes = 0, lastStatsTs = 0, lastStats = {};
  let zoomRange = null;   // {min, max, step} or null
  let torchOk = false;

  // ------------------------------------------------------------ ui
  const setState = (text, cls) => { el.state.textContent = text; el.dot.className = "dot" + (cls ? " " + cls : ""); };
  const hint = (text) => { el.hint.textContent = text || ""; };
  const savePrefs = () => localStorage.setItem(PREFS_KEY, JSON.stringify(cfg));
  const loadPrefs = () => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (typeof p.camera === "string") cfg.camera = p.camera;
      if (RESOLUTIONS.includes(p.resolution)) cfg.resolution = p.resolution;
      if (FPS.includes(Number(p.fps))) cfg.fps = Number(p.fps);
      if (Number(p.bitrate) > 0) cfg.bitrate = Number(p.bitrate);
    } catch { /* ignore */ }
  };

  // overlay (status pill + button) hides itself while streaming; tap the screen to bring it back
  let hideTimer = null;
  function showOverlay(autohide = true) {
    el.overlay.classList.remove("hidden");
    clearTimeout(hideTimer);
    if (autohide && live) hideTimer = setTimeout(() => el.overlay.classList.add("hidden"), 3500);
  }
  el.preview.addEventListener("click", () => {
    if (el.overlay.classList.contains("hidden")) showOverlay();
    else if (live) el.overlay.classList.add("hidden");
  });

  // ------------------------------------------------------------ cameras
  const kindOf = (label) => {
    const l = label.toLowerCase();
    if (l.includes("front")) return "front";
    if (l.includes("ultra")) return "ultrawide";
    if (l.includes("telephoto")) return "tele";
    if (l.includes("dual") || l.includes("triple")) return "auto";
    return "wide";
  };

  async function listCameras() {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
    cameras = devs.map((d) => ({ id: d.deviceId, label: d.label || "Camera", kind: kindOf(d.label || "") }));
    if (!cameras.some((c) => c.id === cfg.camera)) {
      const main = cameras.find((c) => c.kind === "wide") || cameras[0];
      cfg.camera = main ? main.id : "";
    }
  }

  const cameraIdByKind = (kind) => {
    const k = String(kind).toLowerCase();
    if (k === "back") return (cameras.find((c) => c.kind === "wide") || {}).id || null;
    const c = cameras.find((c) => c.kind === k || c.id === kind || c.label.toLowerCase() === k);
    return c ? c.id : null;
  };

  // ------------------------------------------------------------ capture
  async function openCamera() {
    const [w, h] = cfg.resolution.split("x").map(Number);
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: cfg.camera ? { exact: cfg.camera } : undefined,
               width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: cfg.fps } },
    });
    track = stream.getVideoTracks()[0];
    track.contentHint = "motion";
    el.preview.srcObject = stream;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    zoomRange = caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 } : null;
    torchOk = !!caps.torch;
  }

  async function applyZoom(v) {
    if (!track || !zoomRange) return;
    v = Math.min(zoomRange.max, Math.max(zoomRange.min, Number(v)));
    try { await track.applyConstraints({ advanced: [{ zoom: v }] }); } catch (e) { hint("zoom: " + e.message); }
  }

  async function applyTorch(on) {
    if (!track || !torchOk) return;
    try { await track.applyConstraints({ advanced: [{ torch: !!on }] }); } catch (e) { hint("torch: " + e.message); }
  }

  function closeCamera() {
    if (stream) for (const t of stream.getTracks()) t.stop();
    stream = null; track = null; el.preview.srcObject = null; zoomRange = null; torchOk = false;
  }

  // ------------------------------------------------------------ webrtc
  function preferH264(transceiver) {
    try {
      const caps = RTCRtpSender.getCapabilities("video");
      if (!caps || !transceiver.setCodecPreferences) return;
      const h264 = caps.codecs.filter((c) => c.mimeType === "video/H264");
      const rest = caps.codecs.filter((c) => c.mimeType !== "video/H264");
      transceiver.setCodecPreferences([...h264, ...rest]);
    } catch { /* older Safari: server prefers H264 too */ }
  }

  async function applyBitrate() {
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (!sender) return;
    const p = sender.getParameters();
    if (!p.encodings || !p.encodings.length) p.encodings = [{}];
    p.encodings[0].maxBitrate = Number(cfg.bitrate) * 1_000_000;
    p.encodings[0].maxFramerate = Number(cfg.fps);
    p.encodings[0].scaleResolutionDownBy = 1;
    p.degradationPreference = "maintain-resolution";
    try { await sender.setParameters(p); } catch (e) { console.warn("setParameters", e); }
  }

  const waitIce = (pc) => new Promise((res) => {
    if (pc.iceGatheringState === "complete") return res();
    const t = setTimeout(res, 2500);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
  });

  async function connect() {
    pc = new RTCPeerConnection({ iceServers: [] });
    const tx = pc.addTransceiver(track, { direction: "sendonly", streams: [stream] });
    preferH264(tx);
    pc.addEventListener("connectionstatechange", () => {
      const st = pc.connectionState;
      if (st === "connected") { setState("streaming", "ok"); applyBitrate(); showOverlay(); }
      else if (st === "connecting") setState("connecting", "warn");
      else if (st === "failed" || st === "disconnected" || st === "closed") {
        setState(st, "err"); showOverlay(false);
        if (live && !restarting) scheduleRestart();
      }
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIce(pc);
    const res = await fetch("/offer", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sdp: pc.localDescription.sdp, type: pc.localDescription.type }) });
    if (!res.ok) throw new Error("PC refused the stream (" + res.status + ")");
    await pc.setRemoteDescription(await res.json());
  }

  function disconnect() {
    if (pc) { try { pc.close(); } catch { /* ignore */ } pc = null; }
    fetch("/hangup", { method: "POST" }).catch(() => {});
  }

  // ------------------------------------------------------------ start / stop
  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hint("Camera blocked: open this page over https and trust the lenso certificate first."); return;
    }
    live = true; el.start.classList.add("live"); setState("starting", "warn"); hint("");
    try {
      await openCamera();
      await listCameras();
      savePrefs();
      await connect();
      await keepAwake();
      startStats();
    } catch (e) {
      setState("error", "err"); hint(e.message);
      live = false; el.start.classList.remove("live");
      closeCamera(); disconnect();
    }
  }

  function stop() {
    live = false; stopStats(); disconnect(); closeCamera();
    el.start.classList.remove("live"); setState("idle"); showOverlay(false); releaseAwake();
  }

  async function restart() {
    if (!live || restarting) return;
    restarting = true;
    stopStats(); disconnect(); closeCamera();
    try { await openCamera(); await connect(); startStats(); savePrefs(); }
    catch (e) { setState("error", "err"); hint(e.message); }
    restarting = false;
  }
  let restartTimer = null;
  const scheduleRestart = () => { clearTimeout(restartTimer); restartTimer = setTimeout(restart, 1500); };

  // ------------------------------------------------------------ physical tilt
  // iOS straightens the camera frame for the *interface* orientation. With the phone's
  // orientation lock on, the interface stays portrait while the phone is sideways, so
  // we measure the real tilt with the motion sensor and let the PC undo it.
  let tilt = null;            // 0 upright, 90 turned clockwise, 180 upside down, 270 counter-clockwise
  let tiltPermission = "unknown";
  function onOrientation(e) {
    const beta = e.beta, gamma = e.gamma;
    if (beta == null || gamma == null) return;
    let t = tilt;
    if (Math.abs(gamma) > 50) t = gamma > 0 ? 90 : 270;        // right edge down = turned clockwise
    else if (Math.abs(beta) > 35) t = beta > 0 ? 0 : 180;
    if (t !== tilt) { tilt = t; sendStatus(); }
  }
  async function enableTilt() {
    if (tiltPermission === "granted") return;
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        tiltPermission = await DeviceOrientationEvent.requestPermission();   // needs a user tap on iOS
      } else {
        tiltPermission = "granted";
      }
    } catch { tiltPermission = "denied"; }
    if (tiltPermission === "granted") window.addEventListener("deviceorientation", onOrientation);
    sendStatus();
  }
  // any first touch is a gesture iOS accepts for the permission prompt
  document.addEventListener("touchend", () => enableTilt(), { once: true });

  // ------------------------------------------------------------ wake lock
  async function keepAwake() { try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch { /* ignore */ } }
  function releaseAwake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && live) keepAwake(); });

  // ------------------------------------------------------------ stats + control socket
  function startStats() {
    stopStats(); lastBytes = 0; lastStatsTs = 0;
    statsTimer = setInterval(async () => {
      if (!pc) return;
      let report; try { report = await pc.getStats(); } catch { return; }
      let out = null;
      report.forEach((r) => { if (r.type === "outbound-rtp" && r.kind === "video") out = r; });
      if (!out) return;
      const now = out.timestamp || performance.now();
      const mbps = lastStatsTs ? ((out.bytesSent - lastBytes) * 8) / ((now - lastStatsTs) / 1000) / 1e6 : 0;
      lastBytes = out.bytesSent; lastStatsTs = now;
      lastStats = { width: out.frameWidth, height: out.frameHeight, fps: out.framesPerSecond, mbps: Number(mbps.toFixed(1)),
        limited: out.qualityLimitationReason && out.qualityLimitationReason !== "none" ? out.qualityLimitationReason : null };
      sendStatus();
    }, 1000);
  }
  function stopStats() { clearInterval(statsTimer); statsTimer = null; lastStats = {}; }

  function sendStatus() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const cam = cameras.find((c) => c.id === cfg.camera);
    const s = track ? track.getSettings() : {};
    ws.send(JSON.stringify({
      live, streaming: !!(pc && pc.connectionState === "connected"),
      camera: cam ? cam.label : null, camera_kind: cam ? cam.kind : null,
      cameras: cameras.map((c) => ({ kind: c.kind, label: c.label })),
      requested: { camera: cfg.camera, resolution: cfg.resolution, fps: cfg.fps, bitrate: cfg.bitrate },
      actual: { width: s.width, height: s.height, fps: s.frameRate ? Math.round(s.frameRate) : undefined },
      zoom: zoomRange ? Number(s.zoom || zoomRange.min) : null, zoom_range: zoomRange,
      torch: torchOk ? !!s.torch : null,
      tilt, tilt_permission: tiltPermission,
      ui_angle: (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0,
      ...lastStats,
    }));
  }

  function openControl() {
    ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
    ws.onopen = () => { wsRetry = 1000; sendStatus(); };
    ws.onclose = () => { ws = null; setTimeout(openControl, wsRetry); wsRetry = Math.min(wsRetry * 2, 15000); };
    ws.onerror = () => ws && ws.close();
    ws.onmessage = (ev) => { try { handleCommand(JSON.parse(ev.data)); } catch (e) { console.warn("bad command", e); } };
  }

  // Everything the PC can ask for. POST /api/cmd {...} ends up here.
  async function handleCommand(cmd) {
    let needRestart = false;
    if (cmd.resolution && RESOLUTIONS.includes(cmd.resolution) && cmd.resolution !== cfg.resolution) { cfg.resolution = cmd.resolution; needRestart = true; }
    if (cmd.fps && FPS.includes(Number(cmd.fps)) && Number(cmd.fps) !== cfg.fps) { cfg.fps = Number(cmd.fps); needRestart = true; }
    if (cmd.camera) { const id = cameraIdByKind(cmd.camera); if (id && id !== cfg.camera) { cfg.camera = id; needRestart = true; } }
    if (cmd.bitrate) { cfg.bitrate = Number(cmd.bitrate); savePrefs(); await applyBitrate(); }
    if (cmd.zoom !== undefined) await applyZoom(cmd.zoom);
    if (cmd.torch !== undefined) await applyTorch(cmd.torch);
    if (cmd.action === "reload") { location.reload(); return; }
    if (cmd.action === "start" && !live) await start();
    else if (cmd.action === "stop" && live) stop();
    else if (needRestart) { savePrefs(); if (live) await restart(); }
    sendStatus();
  }
  setInterval(() => { if (!live) sendStatus(); }, 3000);   // keep the PC informed while idle too

  // ------------------------------------------------------------ boot
  el.start.addEventListener("click", () => { enableTilt(); live ? stop() : start(); });

  (async () => {
    loadPrefs();
    let allowed = false;
    if (navigator.mediaDevices) {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        for (const t of probe.getTracks()) t.stop();
        allowed = true;
      } catch { /* user will be asked on Start */ }
      await listCameras();
    } else {
      hint("Camera blocked: open this page over https and trust the lenso certificate first.");
    }
    openControl();
    setState("idle");
    if (allowed) start();   // permission already granted: just go
  })();
})();
