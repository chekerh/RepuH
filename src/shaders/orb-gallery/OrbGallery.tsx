"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import "@/shaders/threeui.css";
import orbGallerySource from "./sources/orb-gallery.html";

const LIGHT_ROOT = `:root{
    --bg:#e8ecf4;
    --ink:#0f172a;
    --dim:rgba(15,23,42,.72);
    --faint:rgba(15,23,42,.52);
    --line:rgba(15,23,42,.18);
    --line-2:rgba(15,23,42,.28);
    --pad:clamp(20px,3.4vw,52px);
  }`;

const DARK_ROOT = `:root{
    --bg:#0b0f16;
    --ink:#f4f3f0;
    --dim:rgba(244,243,240,.60);
    --faint:rgba(244,243,240,.40);
    --line:rgba(255,255,255,.12);
    --line-2:rgba(255,255,255,.20);
    --pad:clamp(20px,3.4vw,52px);
  }`;

// The iframe's internal sphere draws after load; this cap keeps a slow or
// headless environment from hanging the app boot loader forever.
const BOOT_READY_MS = 3000;

export type OrbGalleryProps = {
  className?: string;
  style?: CSSProperties;
};

/** The landing hero globe.
 *
 * Two behaviours matter here:
 *
 * 1. Once the iframe has mounted it stays mounted. Earlier this component
 *    unmounted it whenever the host left the viewport, so scrolling down and
 *    back reloaded the document and the sphere was briefly a black rectangle,
 *    and could stay blank if the reload failed. Browsers already throttle
 *    rendering for offscreen frames, so keeping it costs little and removes
 *    the gap.
 * 2. A painted placeholder sits behind the frame. The frame fades in on load,
 *    so there is never an empty hero while the sphere assembles.
 */
export function OrbGallery({ className = "", style }: OrbGalleryProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [hostVisible, setHostVisible] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    };
    update();
    window.addEventListener("repuh-theme", update as EventListener);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.removeEventListener("repuh-theme", update as EventListener);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHostVisible(entry?.isIntersecting ?? true);
      },
      { rootMargin: "80px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Mount once, never tear down on scroll. A hidden document still keeps the
  // last painted frame, so returning to the tab shows the sphere, not a reload.
  if (!activated && hostVisible && documentVisible) setActivated(true);

  // App boot loader: on the landing this component is the readiness source.
  useEffect(() => {
    if (!activated) return undefined;
    const done = () => {
      setReady(true);
      if (typeof window.repuhReady === "function") window.repuhReady();
    };
    const timeoutId = setTimeout(done, BOOT_READY_MS);
    return () => clearTimeout(timeoutId);
  }, [activated]);

  return (
    <div
      ref={hostRef}
      className={`threeui-background orb-gallery${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Interactive sphere of RepuH product screens"
      data-state={!activated ? "loading" : ready ? "ready" : "painting"}
      style={{
        position: "relative",
        overflow: "hidden",
        background: theme === "light" ? "#e8ecf4" : "#0b0f16",
        pointerEvents: "auto",
        ...style,
      }}
    >
      {/* Placeholder: a still radial wash plus a hairline orbit, so the hero
          reads as intentional before the sphere paints. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700"
        style={{ opacity: ready ? 0 : 1 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 46%, rgba(124,157,255,0.16) 0%, rgba(53,211,174,0.05) 45%, rgba(11,15,22,0) 72%)",
          }}
        />
        <div
          className="size-[min(52vmin,22rem)] rounded-full border border-white/10"
          style={{
            animation: "orb-idle 9s linear infinite",
            transform: "rotateX(64deg)",
          }}
        />
      </div>

      {activated ? (
        <iframe
          title="Orb Gallery"
          srcDoc={orbGallerySource.replace(/:root\s*\{[^}]*\}/, theme === "light" ? LIGHT_ROOT : DARK_ROOT)}
          sandbox="allow-scripts allow-top-navigation-by-user-activation"
          loading="eager"
          onLoad={() => {
            setReady(true);
            if (typeof window.repuhReady === "function") window.repuhReady();
          }}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            border: 0,
            background: "transparent",
            opacity: ready ? 1 : 0,
            pointerEvents: ready ? "auto" : "none",
            transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      ) : null}

      <style>{`
        @keyframes orb-idle {
          from { transform: rotateX(64deg) rotateZ(0deg); }
          to { transform: rotateX(64deg) rotateZ(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-gallery [style*="orb-idle"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
