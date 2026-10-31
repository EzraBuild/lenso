"use client";

import { useEffect, useRef } from "react";

/*
  Sensor: a field of photosites, like the chip behind a lens.

  - A soft light drifts across the sensor and exposes the cells under it.
  - The pointer paints light: cells it passes over flare and slowly decay.
  - Every few seconds an autofocus bracket hunts, shrinks onto a point, locks
    with a flash and prints a tiny exposure readout (shutter, aperture, ISO).

  Colour follows the theme through --fx / --fx-strength.
*/

const CELL = 14;
const GAP = 3;
const SHUTTERS = ["1/30", "1/60", "1/125", "1/250", "1/500"];
const APERTURES = ["f/1.8", "f/2.2", "f/2.8"];
const ISOS = ["100", "200", "400", "800"];

type Focus = { x: number; y: number; born: number; label: string };

export function Sensor({
  className = "",
  density = 1,
  focus = true,
}: {
  className?: string;
  /** scales how bright the ambient exposure is */
  density?: number;
  /** draw the autofocus brackets */
  focus?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rgb = "250,250,250";
    let strength = 1;
    const readTheme = () => {
      const cs = getComputedStyle(canvas);
      rgb = cs.getPropertyValue("--fx").trim().replace(/\s+/g, "") || rgb;
      strength = parseFloat(cs.getPropertyValue("--fx-strength")) || strength;
    };
    readTheme();
    const mo = new MutationObserver(readTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let w = 0, h = 0, cols = 0, rows = 0, dpr = 1;
    let heat = new Float32Array(0);
    const pitch = CELL + GAP;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / pitch) + 1;
      rows = Math.ceil(h / pitch) + 1;
      heat = new Float32Array(cols * rows);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // pointer light painting -----------------------------------------------
    let px = -1e9, py = -1e9, lastPx = px, lastPy = py;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    };
    const onLeave = () => { px = py = -1e9; };
    const host = canvas.parentElement ?? canvas;
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);

    const paint = (x: number, y: number, amount: number, radius: number) => {
      const cx = x / pitch, cy = y / pitch;
      const rr = Math.ceil(radius / pitch);
      for (let j = Math.max(0, Math.floor(cy - rr)); j <= Math.min(rows - 1, Math.ceil(cy + rr)); j++) {
        for (let i = Math.max(0, Math.floor(cx - rr)); i <= Math.min(cols - 1, Math.ceil(cx + rr)); i++) {
          const dx = (i + 0.5) - cx, dy = (j + 0.5) - cy;
          const d2 = (dx * dx + dy * dy) * pitch * pitch;
          const v = amount * Math.exp(-d2 / (radius * radius * 0.5));
          const k = j * cols + i;
          if (v > heat[k]) heat[k] = Math.min(1, heat[k] + v * 0.6);
        }
      }
    };

    // autofocus ---------------------------------------------------------------
    let af: Focus | null = null;
    let nextAf = performance.now() + 500;
    const pick = (t: number): Focus => ({
      x: w * (0.15 + Math.random() * 0.7),
      y: h * (0.15 + Math.random() * 0.6),
      born: t,
      label: `AF  ${SHUTTERS[(Math.random() * SHUTTERS.length) | 0]}  ${APERTURES[(Math.random() * APERTURES.length) | 0]}  ISO ${ISOS[(Math.random() * ISOS.length) | 0]}`,
    });

    const bracket = (x: number, y: number, s: number, alpha: number, arm: number) => {
      const l = x - s / 2, t = y - s / 2, r = x + s / 2, b = y + s / 2;
      ctx.strokeStyle = `rgba(${rgb},${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l, t + arm); ctx.lineTo(l, t); ctx.lineTo(l + arm, t);
      ctx.moveTo(r - arm, t); ctx.lineTo(r, t); ctx.lineTo(r, t + arm);
      ctx.moveTo(r, b - arm); ctx.lineTo(r, b); ctx.lineTo(r - arm, b);
      ctx.moveTo(l + arm, b); ctx.lineTo(l, b); ctx.lineTo(l, b - arm);
      ctx.stroke();
    };

    // frame ---------------------------------------------------------------------
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      // two slow light sources sweep the chip
      const s = t / 1000;
      const l1x = w * (0.5 + 0.42 * Math.sin(s * 0.11)), l1y = h * (0.45 + 0.35 * Math.cos(s * 0.07));
      const l2x = w * (0.5 + 0.38 * Math.cos(s * 0.05 + 2)), l2y = h * (0.5 + 0.4 * Math.sin(s * 0.09 + 1));
      const sig1 = (Math.min(w, h) * 0.17) ** 2, sig2 = (Math.min(w, h) * 0.12) ** 2;

      // pointer trail: paint along the segment so fast moves stay continuous
      if (px > -1e8) {
        if (lastPx > -1e8) {
          const steps = Math.max(1, Math.ceil(Math.hypot(px - lastPx, py - lastPy) / 6));
          for (let k = 1; k <= steps; k++) paint(lastPx + (px - lastPx) * k / steps, lastPy + (py - lastPy) * k / steps, 1, 42);
        } else paint(px, py, 1, 42);
      }
      lastPx = px; lastPy = py;

      ctx.clearRect(0, 0, w, h);

      // focus state
      let fx = 0, fy = 0, fboost = 0;
      if (focus && !reduced) {
        if (!af && t >= nextAf) af = pick(t);
        if (af) {
          const age = t - af.born;
          if (age > 3200) { af = null; nextAf = t + 1800 + Math.random() * 2200; }
          else {
            fx = af.x; fy = af.y;
            fboost = age < 500 ? 0 : age < 700 ? (age - 500) / 200 : age > 2600 ? Math.max(0, 1 - (age - 2600) / 600) : 1;
          }
        }
      }

      for (let j = 0; j < rows; j++) {
        const cy = j * pitch + CELL / 2;
        for (let i = 0; i < cols; i++) {
          const cx = i * pitch + CELL / 2;
          const k = j * cols + i;
          const d1 = (cx - l1x) ** 2 + (cy - l1y) ** 2;
          const d2 = (cx - l2x) ** 2 + (cy - l2y) ** 2;
          // per-photosite grain: a fixed hash so the chip has texture, not a smooth blob
          const grain = 0.45 + 0.55 * ((((i * 73856093) ^ (j * 19349663)) >>> 0) % 97) / 96;
          let v = (0.2 * Math.exp(-d1 / sig1) + 0.15 * Math.exp(-d2 / sig2)) * density * grain;
          if (fboost) {
            const df = (cx - fx) ** 2 + (cy - fy) ** 2;
            v += 0.35 * fboost * Math.exp(-df / 1800);
          }
          const hv = heat[k];
          if (hv > 0.004) { v += hv; heat[k] = hv * 0.974; }
          if (v < 0.02) continue;
          const a = Math.min(1, v) * strength;
          ctx.fillStyle = `rgba(${rgb},${a * 0.85})`;
          // bright cells read as "saturated": a touch larger
          const grow = v > 0.6 ? 1 : 0;
          ctx.fillRect(cx - CELL / 2 - grow, cy - CELL / 2 - grow, CELL + grow * 2, CELL + grow * 2);
        }
      }

      if (af) {
        const age = t - af.born;
        const ease = 1 - Math.pow(1 - Math.min(1, age / 500), 3);
        const size = 150 - 94 * ease;
        const locked = age >= 500;
        const fade = age > 2600 ? Math.max(0, 1 - (age - 2600) / 600) : 1;
        const flash = locked && age < 650 ? 1 : 0.55;
        bracket(af.x, af.y, size, fade * flash * strength, locked ? 10 : 7);
        if (locked) {
          ctx.fillStyle = `rgba(${rgb},${fade * 0.9 * strength})`;
          ctx.fillRect(af.x - 1, af.y - 1, 2, 2);
          ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.textBaseline = "top";
          ctx.fillStyle = `rgba(${rgb},${fade * 0.6 * strength})`;
          ctx.fillText(af.label, af.x + size / 2 + 10, af.y - size / 2);
        }
      }

      if (reduced) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [density, focus]);

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden />;
}
