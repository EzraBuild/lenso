import { Compare } from "@/components/compare";
import { Marquee } from "@/components/marquee";
import { Nav } from "@/components/Nav";
import { Crosshairs, Rails } from "@/components/rails";
import { Reveal } from "@/components/reveal";
import { Sensor } from "@/components/sensor";
import { SignalPath } from "@/components/signal-path";
import { Telemetry } from "@/components/telemetry";
import { Ticker } from "@/components/ticker";
import { DOWNLOAD, RELEASES, REPO, VERSION } from "@/lib/release";

const FEATURES = [
  {
    k: "01",
    t: "Hardware H.264 over Wi-Fi",
    d: "The iPhone encodes in hardware and streams over WebRTC on your local network. No cloud, no account, no internet needed.",
  },
  {
    k: "02",
    t: "A phone page that is only the picture",
    d: "Open it from the Home Screen like an app. The screen shows the camera and nothing else. Every setting lives on the PC.",
  },
  {
    k: "03",
    t: "Everything from the desktop",
    d: "Front, back, ultrawide, telephoto. 720p to 4K, 24 to 60 fps, bitrate, zoom, torch. A live preview of what your webcam outputs.",
  },
  {
    k: "04",
    t: "Always upright",
    d: "The phone reports its real tilt from the motion sensor. Lenso straightens the picture even with Portrait Orientation Lock on.",
  },
  {
    k: "05",
    t: "A normal 16:9 webcam frame",
    d: "Letterbox an upright phone picture into 1920×1080, or crop to fill. Zoom, Teams, Discord, Meet and OBS all see a camera called lenso.",
  },
  {
    k: "06",
    t: "Scriptable",
    d: "A small local JSON API drives everything: switch lens, set zoom, start, stop, rotate. curl it from anything.",
  },
];

const STEPS = [
  { n: "1", t: "Install Lenso on the PC", d: "One installer. It registers the virtual webcam and puts Lenso in your Start menu." },
  { n: "2", t: "Open the page on the iPhone", d: "Lenso shows the address. Trust the local certificate once, add it to the Home Screen." },
  { n: "3", t: "Pick lenso as your camera", d: "In any app. Adjust lens, quality and framing from the desktop while you are live." },
];

const ZEROS = [
  { v: "$0", k: "price", d: "No tier, no trial, no upsell." },
  { v: "0", k: "watermarks", d: "Your picture is your picture." },
  { v: "0", k: "accounts", d: "Nothing to sign up for. Nothing phones home." },
  { v: "1", k: "installer", d: "Receiver, virtual camera and control window in one." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{children}</h2>;
}

function DownloadArrow() {
  return (
    <svg className="cta-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M5.25 0h1.5v7.19l2.47-2.47 1.06 1.06L6 10.06 1.72 5.78l1.06-1.06 2.47 2.47V0ZM0 10.5h12V12H0v-1.5Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <Rails />
      <Nav />
      <main className="flex-1">
        {/* ---------------------------------------------------------------- hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="grid-bg pointer-events-none absolute inset-0" />
          <Sensor className="absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
          <div className="fade-top pointer-events-none absolute inset-x-0 top-0 h-16" />
          <div className="fade-bottom pointer-events-none absolute inset-x-0 bottom-0 h-28" />

          <div className="relative mx-auto max-w-6xl">
            {/* side annotations, like a spec sheet margin */}
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 items-center justify-center border-r border-line min-[80rem]:flex">
              <span className="vtext rotate-180 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">iPhone · iOS 16+ · Safari</span>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 items-center justify-center border-l border-line min-[80rem]:flex">
              <span className="vtext font-mono text-[10px] tracking-[0.2em] text-dim uppercase">Windows 11 · x64 · DirectShow</span>
            </div>
            <div className="pointer-events-none absolute top-6 left-14 hidden font-mono text-[10px] tracking-[0.14em] text-dim uppercase min-[80rem]:block">
              fig. 01 — the missing cable
            </div>
            <div className="pointer-events-none absolute top-6 right-14 hidden font-mono text-[10px] tracking-[0.14em] text-dim uppercase min-[80rem]:block">
              v{VERSION}
            </div>

            <div className="flex flex-col items-center px-5 pt-24 pb-28 text-center sm:pt-32 sm:pb-36">
              <span className="border border-line bg-bg px-2.5 py-1 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                v{VERSION} · Windows 11
              </span>
              <h1 className="mt-7 font-serif text-5xl leading-[1.05] tracking-[-0.02em] text-fg sm:text-6xl lg:text-7xl">
                Your iPhone is<br className="hidden sm:block" /> <span className="text-dim">your webcam.</span>
              </h1>
              <p className="mt-7 max-w-xl font-body-serif text-lg leading-relaxed text-muted sm:text-xl">
                Lenso turns the camera you already own into a crisp Windows webcam over Wi-Fi.
                No OBS, no watermark, no subscription, no Mac.
              </p>

              <div className="mt-9 flex items-center gap-4 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                <a href="#how" className="hover:text-fg">How it works</a>
                <span className="text-dim">/</span>
                <a href={REPO} className="hover:text-fg" target="_blank" rel="noreferrer">GitHub</a>
                <span className="text-dim">/</span>
                <a href={RELEASES} className="hover:text-fg" target="_blank" rel="noreferrer">Releases</a>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <a
                  href={DOWNLOAD}
                  className="cta inline-flex items-center gap-2 border border-fg bg-fg px-5 py-3 font-mono text-[12px] tracking-[0.12em] text-bg uppercase transition-opacity hover:opacity-85"
                >
                  <DownloadArrow />
                  Download for Windows
                </a>
                <span className="font-mono text-[11px] text-dim">free · open source · ~160 MB</span>
              </div>

              <div className="mt-10 h-4">
                <Ticker />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- works in */}
        <Marquee />

        {/* ---------------------------------------------------------------- signal path */}
        <section className="relative border-b border-line">
          <Crosshairs />
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <Reveal>
              <Eyebrow>Signal path</Eyebrow>
              <h3 className="mt-4 font-serif text-4xl tracking-[-0.02em] sm:text-5xl">The missing cable.</h3>
              <p className="mt-4 max-w-xl font-body-serif text-lg leading-relaxed text-muted">
                Your phone already has the best camera in the room. Lenso is the short wire between it and every app on
                your PC: a page on the phone, a window on the PC, a webcam everything can see.
              </p>
            </Reveal>
            <Reveal delay={120} className="mt-14">
              <SignalPath />
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------------- zeros */}
        <section className="relative border-b border-line">
          <Crosshairs />
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {ZEROS.map((z, i) => (
                <Reveal key={z.k} delay={i * 80} className="bg-bg">
                  <div className="p-6">
                    <div className="font-serif text-5xl tracking-[-0.03em] text-fg">{z.v}</div>
                    <div className="mt-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{z.k}</div>
                    <p className="mt-3 text-[13px] leading-relaxed text-dim">{z.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- how */}
        <section id="how" className="relative border-b border-line">
          <Crosshairs />
          <div className="mx-auto max-w-6xl px-5 py-16">
            <Eyebrow>How it works</Eyebrow>
            <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 90} className="bg-bg">
                  <div className="p-6">
                    <div className="font-mono text-[11px] text-dim">step {s.n}</div>
                    <div className="mt-3 font-serif text-2xl tracking-[-0.01em]">{s.t}</div>
                    <p className="mt-3 text-[14px] leading-relaxed text-muted">{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-5 font-mono text-[11px] text-dim">
              Both devices on the same Wi-Fi. 5 GHz or Ethernet on the PC gives the smoothest picture.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- features */}
        <section id="features" className="relative border-b border-line">
          <Crosshairs />
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <Eyebrow>What you get</Eyebrow>
            <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.k} delay={(i % 3) * 80} className="bg-bg">
                  <div className="group h-full p-6 transition-colors hover:bg-card">
                    <div className="flex items-center justify-between font-mono text-[11px] text-dim">
                      <span>{f.k}</span>
                      <span className="h-1.5 w-1.5 bg-line-2 transition-colors group-hover:bg-fg" />
                    </div>
                    <h3 className="mt-3 text-[15px] font-semibold tracking-tight">{f.t}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- compare */}
        <section className="relative border-b border-line">
          <Crosshairs />
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
              <Reveal>
                <Eyebrow>Why not the others</Eyebrow>
                <h3 className="mt-4 font-serif text-3xl tracking-[-0.02em] sm:text-4xl">Every other option asks for something.</h3>
                <p className="mt-4 font-body-serif text-lg leading-relaxed text-muted">
                  A monthly fee, a logo in the corner, a Mac on the desk, or an OBS scene to babysit. Lenso asks for a Wi-Fi
                  network.
                </p>
              </Reveal>
              <Reveal delay={120}>
                <Compare />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- download */}
        <section id="download" className="relative overflow-hidden">
          <Telemetry />
          <Sensor density={0.7} focus={false} className="absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <Reveal>
              <h2 className="font-serif text-4xl tracking-[-0.02em] sm:text-5xl">Get Lenso</h2>
              <p className="mt-5 max-w-lg font-body-serif text-lg leading-relaxed text-muted">
                One installer for the desktop. Nothing to install on the phone: it is a web page you add to the Home Screen.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={DOWNLOAD}
                  className="cta inline-flex items-center justify-center gap-2 border border-fg bg-fg px-5 py-3 font-mono text-[12px] tracking-[0.12em] text-bg uppercase transition-opacity hover:opacity-85"
                >
                  <DownloadArrow />
                  Lenso-Setup-{VERSION}.exe
                </a>
                <a
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center border border-line-2 bg-bg px-5 py-3 font-mono text-[12px] tracking-[0.12em] text-fg uppercase transition-colors hover:bg-card"
                >
                  Source on GitHub
                </a>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <dl className="grid grid-cols-2 gap-px border border-line bg-line font-mono text-[12px]">
                {[
                  ["PC", "Windows 11, x64"],
                  ["Phone", "iPhone, iOS 16+"],
                  ["Network", "Same Wi-Fi, no internet"],
                  ["Webcam name", "lenso"],
                  ["Codec", "H.264, hardware"],
                  ["Price", "Free"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-bg p-4">
                    <dt className="text-[10px] tracking-[0.12em] text-dim uppercase">{k}</dt>
                    <dd className="mt-1 text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <Crosshairs />
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 font-mono text-[11px] tracking-[0.1em] text-dim uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>Lenso · built by Ezra</span>
          <span className="flex gap-4">
            <a href={REPO} className="hover:text-fg" target="_blank" rel="noreferrer">GitHub</a>
            <a href={RELEASES} className="hover:text-fg" target="_blank" rel="noreferrer">Releases</a>
            <a href={`${REPO}/issues`} className="hover:text-fg" target="_blank" rel="noreferrer">Issues</a>
          </span>
        </div>
      </footer>
    </>
  );
}
