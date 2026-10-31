"use client";

import { useEffect, useRef } from "react";

/* Faint drifting telemetry labels drawn on a canvas: the kind of numbers Lenso shows
   while streaming. Colour follows the theme through --fx. */
const WORDS = [
  "1920×1080", "30 fps", "8.0 Mbps", "h264", "hw-enc", "rtt 6ms", "webrtc", "wifi 5GHz",
  "tilt 90°", "auto-upright", "letterbox 16:9", "zoom 1.0x", "ultrawide", "torch off",
  "vcam lenso", "frames 12 904", "dropped 0", "jitter 2ms", "keyframe", "nack 0",
  "cert ok", "lan 10.0.0.12", "sdp answer", "ice connected", "bitrate ↑", "0.3 → 8.0",
];

type Label = { x: number; y: number; vx: number; vy: number; t: string; a: number; p: number };

export function Telemetry() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1, raf = 0;
    // canvas cannot resolve CSS variables: read the real family name next/font generated
    const mono = (getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() || "ui-monospace") + ", ui-monospace, monospace";
    let rgb = "250,250,250";
    const readColour = () => { rgb = getComputedStyle(canvas).getPropertyValue("--fx").trim().replace(/\s+/g, "") || rgb; };
    readColour();
    const mo = new MutationObserver(readColour);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    let labels: Label[] = [];

    const seed = () => {
      labels = Array.from({ length: Math.max(18, Math.round((w * h) / 42000)) }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.05,
        t: WORDS[(i * 7 + Math.floor(Math.random() * WORDS.length)) % WORDS.length],
        a: 0.08 + Math.random() * 0.14,
        p: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `11px ${mono}`;
      ctx.textBaseline = "middle";
      const cx = w / 2, cy = h * 0.42;
      for (const l of labels) {
        if (!reduce) {
          l.x += l.vx * dt;
          l.y += l.vy * dt;
          l.p += dt * 0.0012;
          if (l.x < -80) l.x = w + 40;
          if (l.x > w + 80) l.x = -40;
          if (l.y < -20) l.y = h + 10;
          if (l.y > h + 20) l.y = -10;
        }
        // fade near the headline so text stays readable
        const d = Math.hypot((l.x - cx) / (w * 0.32), (l.y - cy) / (h * 0.32));
        const keepOut = Math.min(1, Math.max(0, (d - 0.55) / 0.5));
        const flicker = reduce ? 1 : 0.75 + 0.25 * Math.sin(l.p);
        ctx.fillStyle = `rgba(${rgb},${(l.a * keepOut * flicker).toFixed(3)})`;
        ctx.fillText(l.t, l.x, l.y);
        ctx.fillRect(l.x - 7, l.y - 1, 2, 2);
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
