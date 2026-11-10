"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

export function applyTheme(next: Theme) {
  const resolved =
    next === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : next;
  document.documentElement.dataset.theme = resolved;
  if (next === "system") localStorage.removeItem("repuh-theme");
  else localStorage.setItem("repuh-theme", next);
  window.dispatchEvent(new CustomEvent("repuh-theme", { detail: next }));
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("repuh-theme");
    // The stored preference is client-only; adopting it after mount keeps the
    // server markup identical and avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "light" || stored === "dark" ? stored : "system");
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Theme>).detail;
      if (detail === "light" || detail === "dark" || detail === "system") setTheme(detail);
    };
    window.addEventListener("repuh-theme", handler);
    return () => window.removeEventListener("repuh-theme", handler);
  }, []);

  if (compact) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const Icon = theme === "dark" ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => {
          setTheme(next);
          applyTheme(next);
        }}
        aria-label={`Switch to ${next} theme`}
        className="grid size-9 place-items-center rounded-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <Icon size={16} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-sm border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={`${option.label} theme`}
            onClick={() => {
              setTheme(option.value);
              applyTheme(option.value);
            }}
            className={cn(
              "grid size-7 place-items-center rounded-xs transition-colors",
              active ? "bg-foreground text-background" : "text-muted hover:text-foreground",
            )}
          >
            <Icon size={14} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
