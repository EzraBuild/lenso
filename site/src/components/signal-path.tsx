/* iPhone → Wi-Fi → lenso → apps. Pure CSS; the dashes move, the dot pulses. */

function Phone() {
  return (
    <div className="relative mx-auto h-44 w-[5.4rem] border border-line-2 bg-card p-1.5">
      <div className="absolute top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 bg-line-2" />
      <div className="relative h-full w-full overflow-hidden bg-bg">
        {/* the picture: a soft diagonal exposure */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--card-2)_0%,var(--bg)_55%,var(--card-2)_100%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:9px_9px] opacity-60" />
        <div className="absolute top-2 right-2 flex items-center gap-1 font-mono text-[8px] tracking-[0.1em] text-fg">
          <span className="live-dot block h-1.5 w-1.5 bg-fg" />
          LIVE
        </div>
        <div className="absolute bottom-2 left-2 font-mono text-[8px] tracking-[0.1em] text-muted">1080p · 30</div>
      </div>
    </div>
  );
}

function Window() {
  return (
    <div className="mx-auto w-full max-w-[14rem] border border-line-2 bg-card">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        <span className="h-1.5 w-1.5 bg-line-2" />
        <span className="h-1.5 w-1.5 bg-line-2" />
        <span className="h-1.5 w-1.5 bg-line-2" />
        <span className="ml-2 font-mono text-[9px] tracking-[0.14em] text-dim uppercase">lenso</span>
      </div>
      <div className="p-2">
        {/* the webcam frame: 16:9 with the upright phone picture letterboxed in it */}
        <div className="relative aspect-video w-full bg-bg">
          <div className="absolute inset-y-0 left-1/2 w-[32%] -translate-x-1/2 bg-[linear-gradient(135deg,var(--card-2)_0%,var(--bg)_55%,var(--card-2)_100%)]" />
          <div className="absolute inset-y-0 left-[34%] w-px bg-line" />
          <div className="absolute inset-y-0 right-[34%] w-px bg-line" />
          <div className="absolute bottom-1 left-1.5 font-mono text-[8px] tracking-[0.1em] text-muted">1920×1080</div>
          <div className="absolute top-1 right-1.5 font-mono text-[8px] tracking-[0.1em] text-muted">upright · letterbox</div>
        </div>
      </div>
    </div>
  );
}

function Apps() {
  const apps = ["Zoom", "Teams", "Meet", "Discord", "Slack", "OBS"];
  return (
    <div className="mx-auto grid w-full max-w-[14rem] grid-cols-2 gap-px border border-line bg-line">
      {apps.map((a) => (
        <div key={a} className="flex items-center justify-between bg-card px-3 py-2.5 font-mono text-[11px] text-fg">
          {a}
          <span className="h-1 w-1 bg-fg" />
        </div>
      ))}
    </div>
  );
}

function Link({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center lg:h-full">
      <div className="flex flex-col items-center gap-2 lg:w-28">
        <span className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase whitespace-nowrap">{label}</span>
        <div className="flow-y h-10 lg:hidden" />
        <div className="flow-x hidden w-full lg:block" />
      </div>
    </div>
  );
}

function Node({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-48 w-full items-center justify-center">{children}</div>
      <div>
        <div className="font-mono text-[11px] tracking-[0.14em] text-fg uppercase">{title}</div>
        <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{sub}</div>
      </div>
    </div>
  );
}

export function SignalPath() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-4">
      <Node title="iPhone" sub="A web page, added to the Home Screen. Hardware H.264 from the lens you pick.">
        <Phone />
      </Node>
      <Link label="Wi-Fi · WebRTC" />
      <Node title="Windows" sub="The Lenso window receives, straightens and frames it, then publishes a virtual camera.">
        <Window />
      </Node>
      <Link label="DirectShow" />
      <Node title="Every app" sub="Anything that lists cameras sees one called lenso. Nothing to configure.">
        <Apps />
      </Node>
    </div>
  );
}
