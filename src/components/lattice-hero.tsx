"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ConstellationField } from "@designcodeio/threeui";
import "@/shaders/threeui.css";
import "@/shaders/threeui-mount.css";

export type CapabilityNode = {
  id: string;
  label: string;
  group: string;
};

// The library drops its canvas without a callback, so the boot loader is told
// the hero is painted two frames after a canvas appears in the host — and a
// cap stops a slow or headless environment from hanging boot forever.
const BOOT_READY_MS = 2500;

declare global {
  interface Window {
    repuhReady?: () => void;
  }
}

function subscribeMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function initialVisible() {
  return typeof document === "undefined" || !document.hidden;
}

/** The landing hero: a full-bleed capability lattice.
 *
 * The threeui ConstellationField draws a constellation on a dark field and a
 * CSS filter pulls it toward the RepuH palette. Under `prefers-reduced-motion`
 * the canvas is replaced by the 2D grouped list, which is keyboard reachable —
 * the brief's fallback clause. The app-level boot loader (root layout) owns
 * the first paint; this hero reports repuhReady() once its first frame shows.
 */
export function CapabilityLatticeHero({
  nodes,
  caption,
  className,
  style,
}: {
  nodes: CapabilityNode[];
  caption?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Reads the media query as an external store: no cascading setState inside
  // the effect body, and both subscribe and getSnapshot re-read each subscribe
  // cycle so theme/motion changes stay live.
  const reduce = useSyncExternalStore(
    subscribeMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [hostVisible, setHostVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(initialVisible);

  const count = Math.max(nodes.length, 1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setHostVisible(entry?.isIntersecting ?? true);
    }, { rootMargin: "120px" });
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

  useEffect(() => {
    if (reduce || !mounted) return undefined;
    let done = false;
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const paintReady = () => {
      if (done) return;
      done = true;
      setReady(true);
      // App-level boot loader: the hero's first frame is the landing's
      // readiness signal.
      if (typeof window.repuhReady === "function") window.repuhReady();
    };
    const poll = () => {
      const canvas = hostRef.current?.querySelector("canvas");
      if (!canvas) {
        rafId = requestAnimationFrame(poll);
        return;
      }
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(paintReady);
      });
    };
    rafId = requestAnimationFrame(poll);
    timeoutId = setTimeout(paintReady, BOOT_READY_MS);
    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mounted, reduce]);

  return (
    <div
      ref={hostRef}
      className={`threeui-mount threeui-background${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Capability lattice: an interactive view of what RepuH models"
      data-state={!mounted ? "paused" : ready ? "ready" : "loading"}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#0b0f16",
        pointerEvents: "auto",
        ...style,
      }}
    >
      {mounted && !reduce ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            /* Pull the canvases toward the primary token without repainting
               the library's own draw loop. */
            filter: "drop-shadow(0 0 6px rgba(124,157,255,0.5))",
          }}
        >
          <ConstellationField
            density={Math.min(1.6, 0.55 + count * 0.018)}
            length={Math.min(1.6, 0.9 + count * 0.02)}
            strokeWidth={1}
            mode="dark"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, padding: "1.5rem", overflowY: "auto" }}>
          <LatticeFallback nodes={nodes} tone="dark" />
        </div>
      )}

      {caption ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 300ms ease" }}
        >
          <span className="label text-white/45">{caption}</span>
          <span className="label text-white/35">
            {nodes.length} capabilit{nodes.length === 1 ? "y" : "ies"}
          </span>
        </div>
      ) : null}

    </div>
  );
}

/** The static fallback. Reads as a grouped catalogue, not a set of fake scores:
 * no estimation number is shown unless the rendering context genuinely has one.
 */
export function LatticeFallback({
  nodes,
  tone = "light",
}: {
  nodes: CapabilityNode[];
  tone?: "light" | "dark";
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CapabilityNode[]>();
    for (const node of nodes) {
      const list = map.get(node.group) ?? [];
      list.push(node);
      map.set(node.group, list);
    }
    return Array.from(map.entries());
  }, [nodes]);

  const dark = tone === "dark";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {grouped.map(([group, items]) => (
        <div
          key={group}
          className={`border p-4 ${dark ? "border-white/15 bg-white/5" : "border-border bg-surface"}`}
        >
          <h3 className={dark ? "label text-white/70" : "label"}>{group}</h3>
          <ul className={dark ? "mt-3 space-y-1.5 text-sm" : "mt-3 space-y-2"}>
            {items.map((node) => (
              <li
                key={node.id}
                className={dark ? "truncate text-white/80" : "truncate text-foreground"}
              >
                {node.label}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
