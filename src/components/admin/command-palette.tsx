"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export interface PaletteItem {
  href: string;
  label: string;
  group: string;
  hint: string;
}

/**
 * Keyboard-first navigation for the console. It only knows the route list, so
 * it cannot act on data: no admin mutation is reachable from here.
 */
export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  return (
    <AnimatePresence>
      {open ? <PalettePanel onClose={onClose} items={items} /> : null}
    </AnimatePresence>
  );
}

/** Mounted only while open, so query and highlight start clean without an
 *  effect that resets state after render. */
function PalettePanel({ onClose, items }: { onClose: () => void; items: PaletteItem[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.label} ${item.group} ${item.hint}`.toLowerCase().includes(needle),
    );
  }, [items, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        const item = filtered[active];
        if (item) {
          event.preventDefault();
          onClose();
          router.push(item.href);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, active, onClose, router]);

  return (
    <motion.div
      className="fixed inset-0 z-90 flex items-start justify-center px-4 pt-[10vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
    >
      <button
        type="button"
        aria-label="Close console search"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: "color-mix(in srgb, var(--console) 55%, transparent)",
          backdropFilter: "blur(6px)",
        }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Search console sections"
        initial={{ opacity: 0, y: reduced ? 0 : -8, scale: reduced ? 1 : 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduced ? 0 : -6, scale: reduced ? 1 : 0.99 }}
        transition={{ duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[34rem] overflow-hidden rounded-md border border-border-strong bg-surface shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search size={15} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Jump to a section…"
            aria-label="Filter console sections"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-xs border border-border-strong px-1.5 py-0.5 text-[0.625rem] text-muted sm:block">
            esc
          </kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-[0.8125rem] text-muted">
              No section matches “{query.trim()}”.
            </li>
          ) : (
            filtered.map((item, index) => (
              <li key={item.href}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    onClose();
                    router.push(item.href);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xs px-3 py-2 text-left text-[0.8125rem] ${
                    index === active ? "bg-surface-muted text-foreground" : "text-muted"
                  }`}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="truncate text-xs text-muted">{item.hint}</span>
                  </span>
                  <span className="shrink-0 text-[0.625rem] uppercase tracking-wide text-muted">
                    {item.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[0.6875rem] text-muted">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft size={11} aria-hidden /> open
          </span>
          <span className="flex items-center gap-3">
            <span>↑ ↓ navigate</span>
            <span>{filtered.length} sections</span>
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
