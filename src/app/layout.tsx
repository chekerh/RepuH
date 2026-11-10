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
    default: "RepuH — Every number, traceable",
    template: "%s · RepuH",
  },
  description:
    "RepuH turns published work into an evidence-backed capability map. Every estimate carries its confidence and its limits, and nothing is scored beyond what the evidence supports.",
  applicationName: "RepuH",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "RepuH — Every number, traceable",
    description:
      "A professional record built from attributable work, where each estimate can be traced back to its evidence.",
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
 * The app-level boot loader: an orb of evidence tiles assembling, the headline,
 * a status line, a progress bar and a percent readout.
 *
 * Rendering rules:
 * - Markup, CSS and script are inline in the root layout so the loader owns
 *   the first byte of every route, before hydration.
 * - Progress reads only real state: document readiness, font readiness, and the
 *   first painted frame reported through window.repuhReady(). It is smoothed,
 *   but it never shows 100 before the app is ready.
 * - The loader always leaves. The skip control appears at 2.2s, the copy admits
 *   the wait at 4s, and at 6.5s the overlay steps aside and says it is showing
 *   the page as it is. A 14s CSS fade covers the case where the script itself
 *   never runs. None of these paths claim readiness the page does not have.
 * - Dismissal cancels every timer and animation frame it owns, so a dismissed
 *   loader leaves no loop running behind the page.
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
  transition: opacity 460ms cubic-bezier(0.16, 1, 0.3, 1), visibility 460ms;
  padding: max(0px, env(safe-area-inset-top)) 0 max(0px, env(safe-area-inset-bottom));
  /* Last-resort guarantee, independent of JS: even if the loader script never
     runs (blocked, cached failure, fatal early error) the overlay fades out
     instead of holding the page. */
  animation: repuh-boot-failsafe 240ms ease 14s forwards;
}
@keyframes repuh-boot-failsafe {
  from { opacity: 1; }
  to { opacity: 0; visibility: hidden; pointer-events: none; }
}
#repuh-boot > header,
#repuh-boot > footer {
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
  transition: opacity 420ms ease, transform 460ms cubic-bezier(0.16, 1, 0.3, 1), filter 420ms ease;
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
#repuh-boot .boot-prog i {
  display: block;
  height: 100%;
  width: 0;
  background: var(--foreground);
  border-radius: 2px;
  transition: width 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
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

#repuh-boot[data-dismissed="true"] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
/* The blur and lift keep the handoff from feeling like a hard cut. */
#repuh-boot[data-dismissed="true"] > main {
  opacity: 0;
  transform: translateY(-10px) scale(0.985);
  filter: blur(6px);
}

@media (prefers-reduced-motion: reduce) {
  #repuh-boot .boot-dot { animation: none; }
  #repuh-boot { transition: none; }
  #repuh-boot main { transition: none; }
  #repuh-boot .boot-prog i { transition: none; }
}
`;

/*
 * Loader behaviour, in the loader's own script so it starts before any app
 * chunk is fetched. Percent target staging:
 *   0.18 -> script runs
 *   0.50 -> document DOMContentLoaded
 *   0.70 -> document.fonts.ready
 *   hydration (BootSignal) or the hero's first painted frame (lattice-hero,
 *   OrbGallery) -> window.repuhReady() -> target 1
 * The displayed percent chases the target, so it reads smoothly without ever
 * claiming readiness early. Every timer and frame is tracked so dismissal
 * leaves nothing running.
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

  var label = boot.querySelector(".boot-chip span");
  var fill = boot.querySelector(".boot-prog i");
  var pctEl = boot.querySelector("footer b span");
  var skip = boot.querySelector(".boot-stall");

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var state = { ready: false, dismissed: false, pct: 0 };
  var timers = [];
  var frame = 0;
  var ticker = 0;

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }

  function dismiss() {
    if (state.dismissed) return;
    state.dismissed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (ticker) clearInterval(ticker);
    clearTimers();
    boot.dataset.dismissed = "true";
    boot.setAttribute("aria-hidden", "true");
    // Removed after the fade so nothing can fade it back in. This timer is
    // deliberately not tracked: it must survive clearTimers().
    setTimeout(function () {
      if (boot.parentNode) boot.parentNode.removeChild(boot);
    }, reduce ? 0 : 640);
  }

  window.repuhReady = function () { state.ready = true; };

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") dismiss();
  });

  // Evaluator bypass for measurement: ?noloader=1 skips the animation itself;
  // it does not fake a successful boot.
  if (new URLSearchParams(location.search).has("noloader")) { dismiss(); return; }

  try {
    // --- orb of tiles: latitude rings of evidence panels that assemble as
    // real progress rises.
    var cv = boot.querySelector("canvas");
    var ctx = cv ? cv.getContext("2d") : null;
    var css = {};
    var TOKENS = ["tile", "edge", "bar", "accent", "primary"];
    function readTheme() {
      var s = getComputedStyle(document.documentElement);
      TOKENS.forEach(function (k) { css[k] = s.getPropertyValue("--repuh-boot-" + k).trim() || s.getPropertyValue("--" + k).trim(); });
    }
    function resize() {
      if (!cv) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var size = cv.clientWidth;
      if (!size) return;
      cv.width = cv.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cv.__R = size * 0.4;
      cv.__size = size;
    }

    if (ctx) {
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
      var draw = function (now) {
        if (state.dismissed) return;
        var dt = Math.min(now - last, 50); last = now;
        var size = cv.__size;
        if (!size) { resize(); size = cv.__size; }
        if (!size) { frame = requestAnimationFrame(draw); return; }
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
          var T = o.T, c = o.c, on = (1 - T.order) <= state.pct + 0.04;
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
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);

      // Status line: the principle lines, honest text only.
      if (!reduce && label) {
        var mi = 0;
        ticker = setInterval(function () {
          if (state.dismissed) return;
          label.classList.add("boot-out");
          setTimeout(function () {
            if (state.dismissed) return;
            mi = (mi + 1) % messages.length;
            label.textContent = messages[mi];
            label.classList.remove("boot-out");
          }, 300);
        }, 1600);
      }
    }
  } catch (err) {
    // The orb must never hold the app hostage: if the canvas fails, the loader
    // still tracks progress and dismisses on readiness.
  }

  // --- real progress: document + fonts, then app-reported readiness
  var staged = 0.18;
  function bump(v) { staged = Math.max(staged, v); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bump(0.5); }, { once: true });
  } else { bump(0.5); }
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () { bump(0.7); }, function () {});
  } else { bump(0.7); }

  if (skip) {
    skip.addEventListener("click", dismiss);
    later(function () { skip.classList.add("enter"); }, 2200);
  }

  // Say what is happening instead of spinning silently, then step aside. The
  // page is already rendered underneath; the overlay is not the product.
  later(function () {
    if (state.ready || state.dismissed) return;
    if (label && !reduce) label.textContent = "Waiting on the hero to paint.";
  }, 4000);
  later(function () {
    if (state.ready || state.dismissed) return;
    if (label) label.textContent = "Showing the page as it is.";
    later(dismiss, 700);
  }, 6500);

  function loop() {
    if (state.dismissed) return;
    var target = state.ready ? 1 : staged;
    state.pct += (target - state.pct) * (state.ready ? 0.2 : 0.05);
    var shown = Math.min(100, Math.round(state.pct * 100));
    if (fill) fill.style.width = shown + "%";
    if (pctEl) pctEl.textContent = String(shown);
    if (state.ready && shown >= 99) {
      if (fill) fill.style.width = "100%";
      if (pctEl) pctEl.textContent = "100";
      later(dismiss, reduce ? 0 : 180);
      return;
    }
    frame = requestAnimationFrame(loop);
  }
  frame = requestAnimationFrame(loop);
})();
`;

/**
 * The loader's markup as a raw HTML blob. It must NOT be part of the React
 * tree: the loader script mutates its percent text and attributes before
 * hydration, and a React-managed copy then fails reconciliation. Injected via
 * dangerouslySetInnerHTML so hydration skips this subtree entirely.
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
  <canvas id="boot-orb" aria-hidden="true"></canvas>
  <h1>Every number, <em>traceable.</em></h1>
  <div class="boot-chip"><i class="boot-dot"></i><span>Private by default</span></div>
  <div class="boot-prog" aria-hidden="true"><i></i></div>
</main>
<footer>
  <span>No platform tests. Only real work.</span>
  <button type="button" class="boot-stall">Skip waiting</button>
  <b aria-hidden="true"><span>0</span>%</b>
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

        {/* Boot loader. Raw HTML (see bootMarkup) so the loader script owns its
            DOM. The changing percent is hidden from assistive tech; the status
            label carries the meaning. */}
        <div
          id="repuh-boot"
          role="status"
          aria-label="Loading RepuH"
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
