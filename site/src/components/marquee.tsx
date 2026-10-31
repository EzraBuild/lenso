const APPS = ["Zoom", "Microsoft Teams", "Google Meet", "Discord", "Slack", "OBS", "Chrome", "FaceTime for Windows", "Webex", "Streamlabs", "Camera app", "WhatsApp"];

/** A slow strip of every app that simply sees a camera called "lenso". */
export function Marquee() {
  const row = [...APPS, ...APPS];
  return (
    <div className="marquee-host relative overflow-hidden border-b border-line py-3" aria-label="Works with">
      <div className="fade-x pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="fade-x pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent" />
      <div className="marquee flex w-max items-center gap-10 font-mono text-[11px] tracking-[0.14em] text-dim uppercase">
        {row.map((a, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="whitespace-nowrap">{a}</span>
            <span className="h-1 w-1 bg-line-2" />
          </span>
        ))}
      </div>
    </div>
  );
}
