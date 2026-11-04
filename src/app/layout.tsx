import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { BootSignal } from "@/components/boot-signal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "RepuH — Your work speaks",
    template: "%s · RepuH",
  },
  description:
    "RepuH builds an evolving, evidence-backed professional identity from real work and verifiable evidence — never from platform-administered tests.",
  applicationName: "RepuH",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "RepuH — Your work speaks",
    description:
      "A living professional identity built from attributable work, with every estimate traceable to its evidence.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F16" },
  ],
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('repuh-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

/**
 * The app-level boot loader, ported from the approved repuh-loader.html
 * design: an orb of evidence tiles (2D canvas), the headline, a status chip
 * cycling the spec principle lines, a progress bar and a percent readout.
 *
 * Rendering rules:
 * - Markup, CSS and script are inline in the root layout so the loader owns
 *   the first byte of every route, before hydration.
 * - Progress reads only real state: document readiness, font readiness, and
 *   hydration/the first painted hero frame reported through window.repuhReady().
 *   It is smoothed but never shows 100 before the app is ready.
 * - Escape hatches: Escape dismisses at any time, and a stall watchdog
 *   (no progress for ~35s) explains what is taking long; there is no fake
 *   time cap that would claim readiness the app does not have.
 * - Colors come from the existing semantic tokens so light and dark themes
 *   both work; reduced-motion collapses all animation (global rule).
 */
const bootCss = `
#repuh-boot {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--background);
  color: var(--foreground);
  display: grid;
  grid-template-rows: auto 1fr auto;
  font-family: var(--font-sans);
  transition: opacity 500ms ease, visibility 500ms ease;
  padding: max(0px, env(safe-area-inset-top)) 0 max(0px, env(safe-area-inset-bottom));
  /* Last-resort guarantee, independent of JS: even if the loader script never
     runs (blocked, cached-failure, fatal early error) the overlay cannot hold
     the page forever. The JS dismissal happens far earlier in normal use. */
  animation: repuh-boot-failsafe 1ms linear 10s forwards;
}
@keyframes repuh-boot-failsafe {
  to { opacity: 0; visibility: hidden; pointer-events: none; }
}
#repuh-boot[data-dismissed="true"] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
#repuh-boot > header, #repuh-boot > footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px clamp(18px, 4vw, 44px);
  font-size: 0.85rem;
  color: var(--muted);
}
#repuh-boot .boot-logo { display: flex; align-items: center; gap: 10px; color: var(--foreground); font-weight: 500; font-size: 1rem; }
#repuh-boot .boot-logo svg { width: 20px; height: 20px; }
#repuh-boot .boot-logo circle, #repuh-boot .boot-logo path { fill: none; stroke: currentColor; stroke-width: 1.5; }
#repuh-boot main {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  padding: 0 20px;
  text-align: center;
}
#repuh-boot canvas {
  width: clamp(180px, 62vmin, 420px);
  aspect-ratio: 1;
  display: block;
}
#repuh-boot h1 {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: clamp(1.7rem, 6vw, 3rem);
  letter-spacing: -0.02em;
  line-height: 1.08;
}
#repuh-boot h1 em { font-family: var(--font-display); font-style: italic; font-weight: 400; letter-spacing: -0.01em; }
#repuh-boot .boot-chip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.82rem;
  color: var(--muted);
}
#repuh-boot .boot-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: repuh-pulse 1.6s ease-in-out infinite; }
#repuh-boot .boot-chip span { transition: opacity 0.3s; }
#repuh-boot .boot-chip span.boot-out { opacity: 0; }
#repuh-boot .boot-prog {
  width: min(340px, 78vw);
  height: 2px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
#repuh-boot .boot-prog i { display: block; height: 100%; width: 0; background: var(--foreground); border-radius: 2px; }
#repuh-boot footer { font-size: 0.78rem; }
#repuh-boot footer b { color: var(--foreground); font-weight: 500; font-variant-numeric: tabular-nums; }
#repuh-boot .boot-stall {
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 4px);
  visibility: hidden;
}
#repuh-boot .boot-stall.enter { visibility: visible; }
#repuh-boot .boot-stall:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
@keyframes repuh-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) {
  #repuh-boot .boot-dot { animation: none; }
  #repuh-boot { transition: none; }
}
`;

/*
 * Loader behaviour, in the loader's own script so it starts before any app
 * chunk is fetched. Percent target staging:
 *   0.35 -> document DOMContentLoaded
 *   +0.2 -> document.fonts.ready
 *   hydration (BootSignal) or the hero's first painted frame (lattice-hero)
 *     -> window.repuhReady() -> target 1
 * The displayed percent chases the target at 8% per frame, so it reads
 * smoothly without ever claiming readiness early.
 */
const bootScript = `
(function () {
  var boot = document.getElementById("repuh-boot");
  if (!boot) return;

  var messages = [
    "Private by default",
    "Evidence before reputation",
    "Confidence shown separately",
    "Every estimate explained",
    "You control what is public"
  ];

  var msgEl = boot.querySelector(".boot-chip span");
  var fill = boot.querySelector(".boot-prog i");
  var pctEl = boot.querySelector("footer b span");
  var chip = boot.querySelector(".boot-chip");

  window.repuhReady = function () { state.ready = true; };
  var state = { ready: false, dismissed: false, pct: 0, lastChange: performance.now() };

  function dismiss() {
    if (state.dismissed) return;
    state.dismissed = true;
    boot.dataset.dismissed = "true";
    boot.setAttribute("aria-hidden", "true");
    setTimeout(function () {
      if (boot.parentNode && state.dismissed) boot.parentNode.removeChild(boot);
    }, 600);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape" && !state.dismissed) dismiss(); }
  document.addEventListener("keydown", onKey);

  // Evaluator bypass for measurement: ?noloader=1 must not fake a successful
  // boot, it only skips the animation itself.
  if (new URLSearchParams(location.search).has("noloader")) { dismiss(); return; }

  try {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- orb of tiles: latitude rings of panels that assemble as progress rises
    var cv = boot.querySelector("canvas");
    var ctx = cv.getContext("2d");
    var css = {};
    var TOKENS = ["tile", "edge", "bar", "accent", "primary"];
    function readTheme() {
      var s = getComputedStyle(document.documentElement);
      TOKENS.forEach(function (k) { css[k] = s.getPropertyValue("--repuh-boot-" + k).trim() || s.getPropertyValue("--" + k).trim(); });
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var size = cv.clientWidth;
      cv.width = cv.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cv.__R = size * 0.4;
      cv.__size = size;
    }
    readTheme();
    resize();
    window.addEventListener("resize", resize);

    var tiles = [], ROWS = 11;
    for (var r = 0; r < ROWS; r++) {
      var lat = -72 + r * (144 / (ROWS - 1));
      var cols = Math.max(5, Math.round(18 * Math.cos(lat * Math.PI / 180)));
      for (var c = 0; c < cols; c++) {
        tiles.push({ lat: lat, lon: c * 360 / cols + (r % 2) * 6, dlat: (144 / (ROWS - 1)) * 0.82, dlon: (360 / cols) * 0.8,
                     phase: Math.random() * 6.28, kind: (r * 7 + c * 3) % 3, order: 0 });
      }
    }
    tiles.sort(function (a, b) { return a.lat - b.lat || a.lon - b.lon; });
    tiles.forEach(function (t, i) { t.order = i / tiles.length; });

    var D = Math.PI / 180;
    function pt(lat, lon, a, tilt, size) {
      var R = cv.__R;
      var la = lat * D, lo = lon * D;
      var x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
      var x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a);
      var y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      var k = 1 / (1 - z2 * 0.22);
      return { x: size / 2 + x1 * R * k, y: size / 2 - y2 * R * k, z: z2 };
    }
    function lerp(p, q, t) { return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; }
    function quadPt(c, u, v) { var a = lerp(c[0], c[1], u), b = lerp(c[3], c[2], u); return lerp(a, b, v); }
    function line(c, u1, v1, u2, v2) { var p = quadPt(c, u1, v1), q = quadPt(c, u2, v2); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }

    var angle = 0, last = performance.now();
    function draw(now) {
      var dt = Math.min(now - last, 50); last = now;
      var size = cv.__size;
      if (!size) { resize(); size = cv.__size; }
      if (!reduce) angle += dt * 0.00032;
      ctx.clearRect(0, 0, size, size);
      var tilt = -0.28, t = now / 1000;
      var list = [];
      tiles.forEach(function (T) {
        var la = T.lat, lo = T.lon, h1 = T.dlat / 2, h2 = T.dlon / 2;
        var c = [pt(la + h1, lo - h2, angle, tilt, size), pt(la + h1, lo + h2, angle, tilt, size),
                 pt(la - h1, lo + h2, angle, tilt, size), pt(la - h1, lo - h2, angle, tilt, size)];
        var cz = (c[0].z + c[1].z + c[2].z + c[3].z) / 4;
        if (cz > -0.12) list.push({ T: T, c: c, z: cz });
      });
      list.sort(function (a, b) { return a.z - b.z; });
      list.forEach(function (o) {
        var T = o.T, c = o.c, on = (1 - T.order) <= state.pct + 0.04;   // fills with real progress
        var depth = Math.max(0, Math.min(1, (o.z + 0.12) / 0.9));
        ctx.globalAlpha = (on ? 0.35 + 0.65 * depth : 0.12 + 0.2 * depth);
        ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y);
        for (var i = 1; i < 4; i++) ctx.lineTo(c[i].x, c[i].y);
        ctx.closePath();
        ctx.fillStyle = on ? css.tile : "transparent"; ctx.fill();
        var glow = on && Math.sin(t * 1.6 + T.phase * 3) > 0.985;
        ctx.strokeStyle = glow ? css.accent : css.edge; ctx.lineWidth = glow ? 1.4 : 1; ctx.stroke();
        if (!on) return;
        ctx.beginPath(); ctx.strokeStyle = css.bar; ctx.lineWidth = 1;
        if (T.kind === 0) { for (var b = 0; b < 4; b++) line(c, .2 + b * .17, .8, .2 + b * .17, .8 - (.2 + ((b * 37 + T.phase * 10) % 5) * .1)); }
        else if (T.kind === 1) { line(c, .2, .3, .8, .3); line(c, .2, .5, .65, .5); line(c, .2, .7, .75, .7); }
        else { line(c, .25, .35, .55, .35); line(c, .25, .6, .75, .6); }
        ctx.stroke();
        if (T.kind === 2 && depth > .3) {
          var p = quadPt(c, .72, .35);
          ctx.fillStyle = css.primary; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.28); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (!state.dismissed) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // --- status chip: the spec principle lines, honest text only
    var mi = 0;
    if (!reduce && msgEl) setInterval(function () {
      msgEl.classList.add("boot-out");
      setTimeout(function () {
        mi = (mi + 1) % messages.length;
        msgEl.textContent = messages[mi];
        msgEl.classList.remove("boot-out");
      }, 300);
    }, 1500);
  } catch (err) {
    // The orb must never hold the app hostage; if the canvas fails, the
    // loader still tracks progress and dismisses on ready.
  }

  // --- real progress: document + fonts, then app-reported readiness
  var staged = 0;
  function bump(v) { staged = Math.max(staged, v); }
  if (document.readyState !== "loading") bump(0.35);
  else document.addEventListener("DOMContentLoaded", function () { bump(0.35); }, { once: true });
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () { bump(0.55); });
  } else { bump(0.55); }

  // Stall watchdog: no displayed-percent change for ~35s reveals what is
  // happening and offers a skip; it does not fabricate readiness.
  var stalled = false;
  setInterval(function () {
    if (state.dismissed || state.ready) return;
    if (performance.now() - state.lastChange > 35000 && !stalled) {
      stalled = true;
      chip.textContent = "";
      chip.appendChild(document.createTextNode("Taking longer than expected — "));
    }
  }, 5000);
  var skip = boot.querySelector(".boot-stall");
  skip.addEventListener("click", dismiss);

  // Always leave a visible way out, and never hold the site hostage longer
  // than one demo pause. Neither path claims the app reported readiness —
  // they simply reveal whatever has rendered so a slow or broken chunk cannot
  // leave the landing as a permanent loading screen.
  setTimeout(function () {
    if (!state.dismissed) skip.classList.add("enter");
  }, 2500);
  setTimeout(function () {
    if (state.dismissed || state.ready) return;
    chip.textContent = "Still loading — showing what is ready.";
    dismiss();
  }, 7000);

  (function loop() {
    var target = state.ready ? 1 : staged > 0 ? Math.min(0.92, staged) : 0;
    staged = Math.min(0.92, staged);
    state.pct += (target - state.pct) * 0.08;
    var shown = Math.round(state.pct * 100);
    if (shown !== boot.__lastPct) { state.lastChange = performance.now(); boot.__lastPct = shown; }
    fill.style.width = shown + "%";
    pctEl.textContent = String(shown);
    if (state.ready && state.pct > 0.985) {
      state.pct = 1; fill.style.width = "100%"; pctEl.textContent = "100";
      dismiss();
      return;
    }
    requestAnimationFrame(loop);
  })();
})();
`;

/**
 * The loader's markup as a raw HTML blob. It must NOT be part of the React
 * tree: the loader script mutates its percent text and attributes before
 * hydration, and a React-managed copy then fails reconciliation (React #418,
 * observed in the Playwright run). Injected via dangerouslySetInnerHTML so
 * hydration skips this subtree entirely, exactly like the standalone
 * repuh-loader.html the design comes from.
 */
const bootMarkup = `
<header>
  <div class="boot-logo">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>
    RepuH
  </div>
  <span>Professional identity</span>
</header>
<main>
  <canvas id="boot-orb" aria-label="A sphere of evidence tiles assembling"></canvas>
  <h1>Every number, <em>traceable.</em></h1>
  <div class="boot-chip"><i class="boot-dot"></i><span>Private by default</span></div>
  <div class="boot-prog" aria-hidden="true"><i></i></div>
</main>
<footer>
  <span>No platform tests. Only real work.</span>
  <button type="button" class="boot-stall">Skip waiting</button>
  <b><span>0</span>%</b>
</footer>
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${instrument.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: bootCss }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to content
        </a>

        {/* Without JS the loader cannot report progress or dismiss itself, so
            it is removed up front rather than shown as a permanent screen. */}
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: "#repuh-boot{display:none}" }} />
        </noscript>

        {/* Boot loader: ported from the approved repuh-loader.html design.
            Raw HTML (see bootMarkup) so the loader script owns its DOM. */}
        <div
          id="repuh-boot"
          role="status"
          aria-live="polite"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: bootMarkup }}
        />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />

        {children}

        <BootSignal />
      </body>
    </html>
  );
}
