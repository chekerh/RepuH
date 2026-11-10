"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import { RailSignal, ResultCards } from "./cards";
import type { Message, Reply, WorkspaceContext } from "@/lib/assistant/types";
import { cn, relativeTime } from "@/lib/utils";

const STARTERS = [
  { label: "Where I stand", command: "status", note: "Observation state, evidence and counts" },
  {
    label: "Strongest signals",
    command: "open fingerprint",
    note: "Estimates ranked with their confidence",
  },
  { label: "Recent evidence", command: "open evidence", note: "Newest attributable records" },
  { label: "Role coverage", command: "open roles", note: "Core requirements and gaps" },
];

const VISIBILITY_LABEL: Record<WorkspaceContext["visibility"], string> = {
  private: "private to you",
  selective: "reachable by link only",
  public: "public",
};

/**
 * The assistant is the workspace: the thread, the evidence rail and the
 * composer share one column so a result is never separated from its limits.
 * The surrounding navigation comes from the app shell, not a second sidebar.
 */
export function AssistantWorkspace({ initial }: { initial: WorkspaceContext }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (messages.length === 0) return;
    endRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, pending, reduced]);

  async function send(command: string, confirmed = false) {
    const text = command.trim();
    if (!text || pending) return;
    setValue("");
    setNotice(null);
    setPending(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);

    let reply: Reply;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: text, confirmed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        reply = {
          error: true,
          text:
            response.status === 401
              ? "Your session expired. Sign in again to continue."
              : (body?.error?.message ?? "That request failed. Try again in a moment."),
        };
      } else {
        reply = (await response.json()) as Reply;
      }
    } catch {
      reply = {
        error: true,
        text: "Could not reach RepuH. Check your connection and try again.",
      };
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", ...reply },
    ]);
    setPending(false);
  }

  const started = messages.length > 0;

  return (
    <div className="min-w-0">
      <header className="rise">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                initial.observing ? "bg-success" : "bg-border-strong",
              )}
            />
            {initial.observing ? "Observation active" : "Observation paused"}
          </span>
          <span aria-hidden>·</span>
          <span suppressHydrationWarning>
            {initial.lastSyncedAt
              ? `Synced ${relativeTime(initial.lastSyncedAt)}`
              : "No source connected"}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} aria-hidden />
            Deterministic. No model is called.
          </span>
        </div>

        <h1 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.03] tracking-tight">
          {started ? "Assistant" : `Welcome back, ${initial.firstName}.`}
        </h1>
        <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-muted sm:text-[0.9375rem]">
          Ask for a section or a summary. Every answer is built from your evidence, and every
          number keeps its confidence and limits.
        </p>
      </header>

      <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
        <div className="min-w-0">
          {!started ? (
            <div className="border-t border-border">
              {STARTERS.map((starter, index) => (
                <motion.button
                  key={starter.command}
                  type="button"
                  onClick={() => void send(starter.command)}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * index }}
                  className="group grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-4 text-left transition-colors hover:bg-surface-muted/60 focus-visible:bg-surface-muted/60"
                >
                  <span className="num text-xs text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {starter.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{starter.note}</span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    aria-hidden
                    className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </motion.button>
              ))}
              <p className="pt-4 text-xs leading-relaxed text-muted">
                {initial.demo
                  ? "This account is running on labelled demo data, so every estimate is illustrative."
                  : `${initial.evidenceCount} evidence records across ${initial.projectCount} projects.`}
              </p>
            </div>
          ) : (
            <div
              role="log"
              aria-live="polite"
              aria-label="Assistant conversation"
              className="space-y-8"
            >
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <p className="max-w-[85%] border-r-2 border-foreground/25 pr-3 text-right text-sm leading-relaxed text-foreground">
                          {message.text}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                          RepuH
                        </p>
                        <p
                          className={cn(
                            "mt-2 max-w-[64ch] text-[0.9375rem] leading-relaxed",
                            message.error ? "text-danger" : "text-foreground",
                          )}
                        >
                          {message.text}
                        </p>
                        {message.cards ? (
                          <ResultCards
                            cards={message.cards}
                            onCommand={(command, confirmed) => void send(command, confirmed)}
                            disabled={pending}
                          />
                        ) : null}
                        {message.suggestions ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion) => (
                              <button
                                key={suggestion.command}
                                type="button"
                                onClick={() => void send(suggestion.command)}
                                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
                              >
                                {suggestion.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {pending ? (
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted" role="status">
              <Loader2 size={13} aria-hidden className="animate-spin motion-reduce:animate-none" />
              Reading your records
            </p>
          ) : null}

          {notice ? (
            <p className="mt-4 text-xs text-danger" role="alert">
              {notice}
            </p>
          ) : null}

          {/* The composer is sticky, so the scroll target has to reserve its
              height (plus the mobile nav) or a new confirmation's buttons land
              underneath it. */}
          <div ref={endRef} className="scroll-mb-[12rem] lg:scroll-mb-[8rem]" />

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-8 bg-background pt-3 lg:bottom-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(value);
              }}
              className="border border-border-strong bg-surface shadow-[0_18px_40px_-32px_rgba(21,28,44,0.55)] transition-colors focus-within:border-primary"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <label htmlFor="assistant-command" className="sr-only">
                  Message the assistant
                </label>
                <input
                  id="assistant-command"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Ask for status, a section, or a summary"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="assistant-command-hint"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  disabled={!value.trim() || pending}
                  aria-label="Send command"
                  className="grid size-9 shrink-0 place-items-center rounded-sm bg-foreground text-background transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowUp size={16} aria-hidden />
                </button>
              </div>
            </form>
            <p id="assistant-command-hint" className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
              A fixed command set, matched without a model. Anything that changes your account asks
              first.
            </p>
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Account context">
          <div className="sticky top-24 space-y-6">
            <section className="border-t border-border pt-4">
              <h2 className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                In this account
              </h2>
              <dl className="mt-3 space-y-2.5 text-xs">
                {[
                  ["Evidence", initial.evidenceCount],
                  ["Projects", initial.projectCount],
                  ["Capabilities", `${initial.skillsWithEvidence}/${initial.skillsTotal}`],
                  ["Certificates", initial.certificateCount],
                ].map(([label, count]) => (
                  <div key={String(label)} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="num text-sm text-foreground">{count}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="border-t border-border pt-4">
              <h2 className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                Strongest signals
              </h2>
              <div className="mt-3 space-y-3">
                {initial.strongest.length === 0 ? (
                  <p className="text-xs leading-relaxed text-muted">
                    No capability is estimated yet. That is the honest state.
                  </p>
                ) : (
                  initial.strongest.map((signal) => (
                    <RailSignal
                      key={signal.id}
                      name={signal.name}
                      confidence={signal.confidence}
                      estimate={signal.estimate}
                    />
                  ))
                )}
              </div>
              <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
                Not an overall score.
              </p>
            </section>

            <section className="border-t border-border pt-4">
              <h2 className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                Visibility
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Your profile is {VISIBILITY_LABEL[initial.visibility]}. You can change that here or
                on the settings page.
              </p>
              <Link
                href="/settings"
                className="group mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                Open settings
                <ArrowUpRight
                  size={12}
                  aria-hidden
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
