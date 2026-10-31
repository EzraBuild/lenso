"use client";

import { useEffect, useState } from "react";

const LINES = [
  "lenso · 1920×1080 · 30 fps · 8.0 Mbps",
  "ice connected · rtt 6 ms · h264 hw",
  "tilt 90° → auto upright · letterbox 16:9",
  "ultrawide · zoom 1.0x · torch off",
  "webcam lenso · frames 12 904 · dropped 0",
];

/** Types one status line at a time, like the receiver's log. */
export function Ticker({ className = "" }: { className?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(LINES[0]);
      return;
    }
    let line = 0, i = 0, dir = 1, t: ReturnType<typeof setTimeout>;
    const step = () => {
      const full = LINES[line];
      i += dir;
      setText(full.slice(0, i));
      let wait = dir > 0 ? 28 + Math.random() * 40 : 12;
      if (dir > 0 && i >= full.length) {
        dir = -1;
        wait = 1800;
      } else if (dir < 0 && i <= 0) {
        dir = 1;
        line = (line + 1) % LINES.length;
        wait = 350;
      }
      t = setTimeout(step, wait);
    };
    t = setTimeout(step, 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <span className={`cursor font-mono text-[11px] tracking-[0.06em] text-dim ${className}`} aria-live="off">
      {text}
    </span>
  );
}
