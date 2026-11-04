"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import "@/shaders/threeui.css";
import orbGallerySource from "./sources/orb-gallery.html";

// The iframe's internal sphere draws after load; this cap keeps a slow or
// headless environment from hanging the app boot loader forever.
const BOOT_READY_MS = 3000;

export type OrbGalleryProps = {
  className?: string;
  style?: CSSProperties;
};

export function OrbGallery({ className = "", style }: OrbGalleryProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [documentVisible, setDocumentVisible] = useState(() => (
    typeof document === "undefined" || !document.hidden
  ));
  const [hostVisible, setHostVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setHostVisible(entry?.isIntersecting ?? true);
    }, { rootMargin: "80px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const mounted = hostVisible && documentVisible;

  // App boot loader: on the landing this component is the readiness source,
  // so a painted iframe (or the cap) fires window.repuhReady().
  useEffect(() => {
    if (!mounted) return undefined;
    const done = () => {
      setReady(true);
      if (typeof window.repuhReady === "function") window.repuhReady();
    };
    const timeoutId = setTimeout(done, BOOT_READY_MS);
    return () => clearTimeout(timeoutId);
  }, [mounted]);

  // Pause tears the iframe down; the next mount is a fresh document, so the
  // previous load result must not show a loading frame as ready. Adjusted
  // during render (React's documented pattern) rather than in an effect.
  const [wasMounted, setWasMounted] = useState(mounted);
  if (wasMounted !== mounted) {
    setWasMounted(mounted);
    setReady(false);
  }

  return (
    <div
      ref={hostRef}
      className={`threeui-background orb-gallery${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Interactive sphere of RepuH product screens"
      data-state={!mounted ? "paused" : ready ? "ready" : "loading"}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0b0f16",
        pointerEvents: "auto",
        ...style,
      }}
    >
      {mounted ? (
        <iframe
          title="Orb Gallery"
          srcDoc={orbGallerySource}
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
            background: "#0b0f16",
            opacity: ready ? 1 : 0,
            pointerEvents: ready ? "auto" : "none",
            transition: "opacity 240ms ease-out",
          }}
        />
      ) : null}
    </div>
  );
}
