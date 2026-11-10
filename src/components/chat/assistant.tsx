"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  HelpCircle,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn, slugifyUsername } from "@/lib/utils";

type Role = "assistant" | "user" | "system";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  chips?: string[];
  createdAt: number;
}

export interface AssistantInitial {
  displayName: string;
  username: string;
  headline: string;
  country: string;
  bio: string;
  specialization: string;
  demoMode: boolean;
  githubConfigured: boolean;
  onboarded: boolean;
  visibility: string;
  leaderboardOptIn: boolean;
}

interface AssistantProps {
  mode: "onboarding" | "control";
  initial: AssistantInitial;
}

const STORAGE_KEY = (mode: string) => `repuh-assistant-messages:${mode}`;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

// Kept here so the assistant can mirror the wizard's specialization list
// without importing the (client-only) wizard module.
const SPECIALIZATION_LIST = [
  "Platform engineering",
  "Backend systems",
  "Frontend systems",
  "Full-stack engineering",
  "DevOps and infrastructure",
  "Software architecture",
  "Data engineering",
] as const;

interface DraftState {
  displayName: string;
  username: string;
  headline: string;
  country: string;
  bio: string;
  specialization: string;
  visibility: "private" | "public" | "selective";
  leaderboardOptIn: boolean;
  connectGithub: boolean;
  useDemoData: boolean;
}

function makeDraft(initial: AssistantInitial): DraftState {
  return {
    displayName: initial.displayName,
    username: initial.username || slugifyUsername(initial.displayName),
    headline: initial.headline,
    country: initial.country,
    bio: initial.bio,
    specialization: initial.specialization || SPECIALIZATION_LIST[0]!,
    visibility: (initial.visibility as DraftState["visibility"]) || "private",
    leaderboardOptIn: initial.leaderboardOptIn,
    connectGithub: false,
    useDemoData: false,
  };
}

export function Assistant({ mode, initial }: AssistantProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(() => makeDraft(initial));
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(mode));
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore corrupt storage; start fresh.
    }
    return [];
  });

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const seededStepRef = useRef<number | null>(null);
  const seededControlRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [activeFeature, setActiveFeature] = useState("overview");
  const [workspaceStats, setWorkspaceStats] = useState<{ evidence: number; certificates: number }>({
    evidence: 0,
    certificates: 0,
  });
  useEffect(() => {
    if (mode !== "control") return;
    let cancelled = false;
    void (async () => {
      try {
        const [evidenceRes, certRes] = await Promise.all([
          fetch("/api/evidence", { credentials: "same-origin" }),
          fetch("/api/certificates", { credentials: "same-origin" }),
        ]);
        const evidencePayload = (await evidenceRes.json().catch(() => null)) as
          | { items?: unknown[]; evidence?: unknown[] }
          | null;
        const certPayload = (await certRes.json().catch(() => null)) as
          | { certificates?: unknown[]; items?: unknown[] }
          | null;
        if (cancelled) return;
        const evidenceCount = Array.isArray(evidencePayload?.items)
          ? evidencePayload.items.length
          : Array.isArray(evidencePayload?.evidence)
            ? evidencePayload.evidence.length
            : 0;
        const certCount = Array.isArray(certPayload?.certificates)
          ? certPayload.certificates.length
          : Array.isArray(certPayload?.items)
            ? certPayload.items.length
            : 0;
        setWorkspaceStats({ evidence: evidenceCount, certificates: certCount });
      } catch {
        // Keep the workspace usable even if a count request fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Persist transcript.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY(mode), JSON.stringify(messages));
    } catch {
      // Storage may be unavailable; ignore.
    }
  }, [messages, mode]);

  const addMessage = (role: Role, content: string, chips?: string[]) => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role, content, chips, createdAt: Date.now() },
    ]);
  };

  // Auto-scroll to newest message.
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  // --- onboarding seeding ----------------------------------------------------
  const seedOnboarding = (step: number) => {
    if (seededStepRef.current === step) return;
    seededStepRef.current = step;
    const d = draftRef.current;
    switch (step) {
      case 0:
        addMessage(
          "assistant",
          "RepuH observes work, not people. No quizzes, challenges or timed tests. It reads activity you authorise and states what that activity can and cannot support.",
          ["I understand"],
        );
        break;
      case 1:
        addMessage(
          "assistant",
          `What display name should appear? Current: ${d.displayName}. Reply with a name, or 'skip' to keep it.`,
        );
        break;
      case 2:
        addMessage(
          "assistant",
          `What username should the profile use? Suggested: ${d.username}. Reply with a username (3-30 chars, lowercase), or 'skip'.`,
        );
        break;
      case 3:
        addMessage(
          "assistant",
          "Any headline? (optional, up to 120 characters). Reply with text, or 'skip'.",
        );
        break;
      case 4:
        addMessage(
          "assistant",
          "Country or region? (optional). Reply with text, or 'skip'.",
        );
        break;
      case 5:
        addMessage(
          "assistant",
          "A short biography? (optional, up to 600 characters). Reply with text, or 'skip'.",
        );
        break;
      case 6: {
        const list = SPECIALIZATION_LIST.map((s, i) => `${i + 1}. ${s}`).join("\n");
        addMessage(
          "assistant",
          `Which specialization fits best?\n${list}\nReply with a number or name, or 'skip' for ${d.specialization}.`,
        );
        break;
      }
      case 7:
        addMessage(
          "assistant",
          initial.demoMode
            ? "Where should the first evidence come from? Reply 'github', 'demo' (labelled development data), or 'none'."
            : "Where should the first evidence come from? Reply 'github' or 'none'. GitHub OAuth must be configured in this environment.",
        );
        break;
      case 8:
        addMessage(
          "assistant",
          "Profile visibility: reply 'private', 'selective', or 'public'.",
          ["private", "selective", "public"],
        );
        break;
      case 9:
        addMessage(
          "assistant",
          "Opt into leaderboards? Reply 'yes' or 'no'. Leaderboards require a public profile and at least two evidence items per skill.",
          ["yes", "no"],
        );
        break;
      case 10: {
        const summary = [
          `Display name: ${d.displayName}`,
          `Username: @${d.username}`,
          `Headline: ${d.headline || "—"}`,
          `Country: ${d.country || "—"}`,
          `Specialization: ${d.specialization}`,
          `Evidence: ${d.useDemoData ? "labelled demo data" : d.connectGithub ? "GitHub (authorisation pending)" : "not connected"}`,
          `Visibility: ${d.visibility}`,
          `Leaderboards: ${d.leaderboardOptIn ? "opted in" : "not opted in"}`,
        ].join("\n");
        addMessage(
          "assistant",
          `Review before saving. Nothing has been sent to an external service yet.\n\n${summary}\n\nType 'save' to create your identity, or 'back' to revisit the answers.`,
          ["save", "back"],
        );
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    if (mode !== "onboarding") return;
    const timer = window.setTimeout(() => seedOnboarding(onboardingStep), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onboardingStep]);

  // --- control seeding -------------------------------------------------------
  useEffect(() => {
    if (mode !== "control" || seededControlRef.current) return;
    const timer = window.setTimeout(() => {
      if (seededControlRef.current) return;
      seededControlRef.current = true;
      addMessage(
        "assistant",
        "Assistant ready. I can open surfaces, change visibility, manage leaderboard preference, connect GitHub, and summarise your profile, evidence and certificates. Type 'help' for the command list.",
        ["help", "status", "open dashboard"],
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode]);

  const handleOnboardingReply = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    addMessage("user", text);
    const lower = normalize(text);
    const d = draftRef.current;

    switch (onboardingStep) {
      case 0:
        if (["i understand", "yes", "continue", "ok", "understood"].includes(lower)) {
          setOnboardingStep(1);
        } else {
          addMessage("assistant", "Please confirm by typing 'I understand'.", ["I understand"]);
        }
        break;
      case 1: {
        const next = lower === "skip" || lower === "" ? d.displayName : text.trim();
        if (next.length < 2) {
          addMessage("assistant", "Display name needs at least 2 characters. Try again.");
          return;
        }
        setDraft((prev) => ({ ...prev, displayName: next }));
        setOnboardingStep(2);
        break;
      }
      case 2: {
        const next = lower === "skip" || lower === "" ? d.username : slugifyUsername(text);
        if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(next)) {
          addMessage(
            "assistant",
            "That username does not fit the rule (3-30 chars, lowercase letters, numbers, hyphen or underscore). Try again.",
          );
          return;
        }
        setDraft((prev) => ({ ...prev, username: next }));
        setOnboardingStep(3);
        break;
      }
      case 3: {
        const next = lower === "skip" ? "" : text.trim().slice(0, 120);
        setDraft((prev) => ({ ...prev, headline: next }));
        setOnboardingStep(4);
        break;
      }
      case 4: {
        const next = lower === "skip" ? "" : text.trim().slice(0, 60);
        setDraft((prev) => ({ ...prev, country: next }));
        setOnboardingStep(5);
        break;
      }
      case 5: {
        const next = lower === "skip" ? "" : text.trim().slice(0, 600);
        setDraft((prev) => ({ ...prev, bio: next }));
        setOnboardingStep(6);
        break;
      }
      case 6: {
        let next = d.specialization;
        const index = Number.parseInt(lower, 10);
        if (!Number.isNaN(index) && index >= 1 && index <= SPECIALIZATION_LIST.length) {
          next = SPECIALIZATION_LIST[index - 1]!;
        } else if (lower !== "skip" && lower !== "") {
          const found = SPECIALIZATION_LIST.find((s) => normalize(s) === lower || normalize(s).includes(lower));
          if (found) next = found;
          else {
            addMessage("assistant", "I did not recognise that specialization. Reply with a number from the list, a name, or 'skip'.");
            return;
          }
        }
        setDraft((prev) => ({ ...prev, specialization: next }));
        setOnboardingStep(7);
        break;
      }
      case 7: {
        if (lower === "github") {
          setDraft((prev) => ({ ...prev, connectGithub: true, useDemoData: false }));
        } else if (lower === "demo") {
          if (!initial.demoMode) {
            addMessage("assistant", "The development adapter is not enabled in this environment. Reply 'github' or 'none'.");
            return;
          }
          setDraft((prev) => ({ ...prev, connectGithub: false, useDemoData: true }));
        } else if (lower === "none" || lower === "skip") {
          setDraft((prev) => ({ ...prev, connectGithub: false, useDemoData: false }));
        } else {
          addMessage("assistant", "Reply 'github', 'demo', or 'none'.");
          return;
        }
        setOnboardingStep(8);
        break;
      }
      case 8: {
        if (lower === "private" || lower === "selective" || lower === "public") {
          setDraft((prev) => ({ ...prev, visibility: lower as DraftState["visibility"] }));
          setOnboardingStep(9);
        } else {
          addMessage("assistant", "Reply 'private', 'selective', or 'public'.");
        }
        break;
      }
      case 9: {
        if (lower === "yes" || lower === "y" || lower === "true") {
          setDraft((prev) => ({ ...prev, leaderboardOptIn: true }));
        } else if (lower === "no" || lower === "n" || lower === "false" || lower === "skip") {
          setDraft((prev) => ({ ...prev, leaderboardOptIn: false }));
        } else {
          addMessage("assistant", "Reply 'yes' or 'no'.");
          return;
        }
        setOnboardingStep(10);
        break;
      }
      case 10: {
        if (lower === "back") {
          setOnboardingStep(1);
          return;
        }
        if (lower !== "save" && lower !== "yes" && lower !== "confirm") {
          addMessage("assistant", "Type 'save' to create your identity, or 'back' to revisit.");
          return;
        }
        await finishOnboarding();
        break;
      }
      default:
        break;
    }
  };

  const finishOnboarding = async () => {
    setPending(true);
    try {
      const d = draftRef.current;
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName: d.displayName.trim(),
          username: d.username,
          headline: d.headline,
          bio: d.bio,
          country: d.country,
          specialization: d.specialization,
          profession: "software-engineer",
          visibility: d.visibility,
          leaderboardOptIn: d.leaderboardOptIn,
          connectGithub: d.connectGithub,
          useDemoData: d.useDemoData,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { next?: string; error?: { message?: string; code?: string }; demoData?: boolean }
        | null;
      if (!response.ok) {
        const code = payload?.error?.code;
        if (response.status === 409 && code === "username_taken") {
          addMessage(
            "assistant",
            "That username is already in use. Reply with a different username, or 'skip' to keep your current one.",
          );
          setOnboardingStep(2);
          return;
        }
        addMessage("assistant", payload?.error?.message ?? "Could not save onboarding. Try again.");
        setOnboardingStep(10);
        return;
      }
      addMessage(
        "assistant",
        "Identity created. Opening your workspace.",
      );
      const next = payload?.next ?? "/dashboard";
      // A first-time onboarding should land in the assistant, which is the
      // product's primary control surface. Repeating onboarding (an already
      // onboarded account) should return to the dashboard instead of leaving
      // the user inside the assistant.
      const destination =
        next.startsWith("/api/")
          ? next
          : initial.onboarded
            ? next === "/assistant"
              ? "/dashboard"
              : next
            : next === "/dashboard"
              ? "/assistant"
              : next;
      if (destination.startsWith("/api/")) {
        router.push(destination);
      } else {
        router.push(destination);
      }
    } catch {
      addMessage("assistant", "Network error. Try again.");
      setOnboardingStep(10);
    } finally {
      setPending(false);
    }
  };

  // --- control mode commands -------------------------------------------------
  const runCommand = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    addMessage("user", text);
    const lower = normalize(text);
    const tokens = lower.split(/\s+/);

    if (lower === "help") {
      addMessage(
        "assistant",
        "Commands:\n" +
          "- help — this list\n" +
          "- status — account and integration status\n" +
          "- open <surface> — dashboard, fingerprint, activity, evidence, certificates, leaderboards, explore, integrations, settings, profile, help, assistant\n" +
          "- visibility <private|selective|public> — change profile visibility\n" +
          "- leaderboard <on|off> — change leaderboard preference\n" +
          "- connect github — start GitHub authorisation\n" +
          "- profile — summarise your profile\n" +
          "- evidence — count your evidence items\n" +
          "- certificates — count your certificates\n" +
          "- clear — clear this transcript",
      );
      return;
    }

    if (lower === "clear") {
      setMessages([]);
      try {
        window.localStorage.removeItem(STORAGE_KEY(mode));
      } catch {
        // ignore
      }
      return;
    }

    if (lower === "status") {
      setPending(true);
      try {
        const res = await fetch("/api/profile", { credentials: "same-origin" });
        const payload = (await res.json().catch(() => null)) as
          | { profile?: { displayName?: string; username?: string; visibility?: string; onboardingComplete?: boolean }; preferences?: { leaderboardOptIn?: boolean } }
          | null;
        if (!res.ok || !payload?.profile) {
          addMessage("assistant", "Could not read status.");
          return;
        }
        const p = payload.profile;
        addMessage(
          "assistant",
          `Signed in as ${p.displayName ?? "—"} (@${p.username ?? "—"}).\nVisibility: ${p.visibility ?? "—"}.\nLeaderboards: ${payload.preferences?.leaderboardOptIn ? "opted in" : "not opted in"}.\nOnboarding: ${p.onboardingComplete ? "complete" : "pending"}.`,
        );
      } catch {
        addMessage("assistant", "Network error.");
      } finally {
        setPending(false);
      }
      return;
    }

    if (tokens[0] === "open" || tokens[0] === "go" || tokens[0] === "navigate") {
      const dest = tokens.slice(1).join(" ");
      const map: Record<string, string> = {
        dashboard: "/dashboard",
        home: "/dashboard",
        overview: "/dashboard",
        fingerprint: "/fingerprint",
        activity: "/activity",
        evidence: "/evidence",
        certificates: "/certificates",
        leaderboards: "/leaderboards",
        rankings: "/leaderboards",
        explore: "/explore",
        integrations: "/integrations",
        settings: "/settings",
        profile: `/u/${initial.username}`,
        help: "/help",
        assistant: "/assistant",
        chat: "/assistant",
      };
      const href = map[dest];
      if (!href) {
        addMessage("assistant", `Unknown surface '${dest}'. Type 'help' for the list.`);
        return;
      }
      addMessage("assistant", `Opening ${dest}.`);
      router.push(href);
      return;
    }

    if (tokens[0] === "visibility" && tokens[1]) {
      const value = tokens[1];
      if (value !== "private" && value !== "selective" && value !== "public") {
        addMessage("assistant", "Visibility must be private, selective, or public.");
        return;
      }
      setPending(true);
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ visibility: value }),
        });
        if (!res.ok) {
          addMessage("assistant", "Could not change visibility.");
          return;
        }
        addMessage("assistant", `Visibility set to ${value}.`);
        router.refresh();
      } catch {
        addMessage("assistant", "Network error.");
      } finally {
        setPending(false);
      }
      return;
    }

    if (tokens[0] === "leaderboard" || tokens[0] === "leaderboards") {
      const arg = tokens[1];
      if (arg !== "on" && arg !== "off") {
        addMessage("assistant", "Use 'leaderboard on' or 'leaderboard off'.");
        return;
      }
      setPending(true);
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ leaderboardOptIn: arg === "on" }),
        });
        if (!res.ok) {
          addMessage("assistant", "Could not change leaderboard preference.");
          return;
        }
        addMessage("assistant", `Leaderboards ${arg === "on" ? "enabled" : "disabled"}.`);
        router.refresh();
      } catch {
        addMessage("assistant", "Network error.");
      } finally {
        setPending(false);
      }
      return;
    }

    if (lower === "connect github" || lower === "connect-github") {
      if (!initial.githubConfigured) {
        addMessage(
          "assistant",
          "GitHub OAuth is not configured in this environment. The Integrations page states this plainly.",
        );
        router.push("/integrations?github=unconfigured");
        return;
      }
      addMessage("assistant", "Starting GitHub authorisation.");
      router.push("/api/integrations/github/connect");
      return;
    }

    if (lower === "profile") {
      setPending(true);
      try {
        const res = await fetch("/api/profile", { credentials: "same-origin" });
        const payload = (await res.json().catch(() => null)) as
          | { profile?: { displayName?: string; username?: string; headline?: string | null; country?: string | null; specialization?: string | null; visibility?: string } }
          | null;
        if (!res.ok || !payload?.profile) {
          addMessage("assistant", "Could not read profile.");
          return;
        }
        const p = payload.profile;
        addMessage(
          "assistant",
          `${p.displayName ?? "—"} (@${p.username ?? "—"})\n${p.headline ?? "—"}\n${p.country ?? "—"}\nSpecialization: ${p.specialization ?? "—"}\nVisibility: ${p.visibility ?? "—"}`,
        );
      } catch {
        addMessage("assistant", "Network error.");
      } finally {
        setPending(false);
      }
      return;
    }

    if (lower === "evidence") {
      setPending(true);
      try {
        const res = await fetch("/api/evidence", { credentials: "same-origin" });
        const payload = (await res.json().catch(() => null)) as
          | { items?: unknown[]; evidence?: unknown[] }
          | null;
        if (!res.ok) {
          addMessage("assistant", "Could not read evidence.");
          return;
        }
        const count = Array.isArray(payload?.items)
          ? payload.items.length
          : Array.isArray(payload?.evidence)
            ? payload.evidence.length
            : 0;
        addMessage("assistant", `You have ${count} evidence item${count === 1 ? "" : "s"}.`);
      } catch {
        addMessage("assistant", "Network error.");
      } finally {
        setPending(false);
      }
      return;
    }

    if (lower === "certificates") {
      setPending(true);
      try {
        const res = await fetch("/api/certificates", { credentials: "same-origin" });
        const payload = (await res.json().catch(() => null)) as
          | { certificates?: unknown[]; items?: unknown[] }
          | null;
        if (!res.ok) {
          addMessage("assistant", "Could not read certificates.");
          return;
        }
        const count = Array.isArray(payload?.certificates)
          ? payload.certificates.length
          : Array.isArray(payload?.items)
            ? payload.items.length
            : 0;
        addMessage("assistant", `You have ${count} certificate${count === 1 ? "" : "s"}.`);
      } catch {
        addMessage("assistant", "Network error.");
      } finally {
        setPending(false);
      }
      return;
    }

    addMessage(
      "assistant",
      "I did not understand that. Type 'help' for the command list.",
    );
  };

  const submit = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setInput("");
    if (mode === "onboarding") {
      await handleOnboardingReply(text);
    } else {
      await runCommand(text);
    }
  };

  const handleChip = (chip: string) => {
    void submit(chip);
  };

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Bot size={18} className="text-primary" />
          <span className="text-sm font-medium">Assistant</span>
        </div>
        <div className="px-3">
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              try {
                window.localStorage.removeItem(STORAGE_KEY(mode));
              } catch {
                // ignore
              }
            }}
            className="flex w-full items-center gap-2 rounded-sm border border-border-strong bg-background px-3 py-2 text-sm hover:bg-surface-muted"
          >
            <Sparkles size={14} />
            New chat
          </button>
        </div>
        <div className="mt-4 px-5 text-xs text-muted">
          {mode === "onboarding"
            ? "Onboarding conversation. Your answers are saved when you type 'save'."
            : "Control surface for RepuH. Commands are deterministic; no external model is invoked."}
        </div>
        <div className="mt-auto border-t border-border p-4 text-xs text-muted">
          {initial.onboarded ? "Signed in" : "Setting up your identity"}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-primary lg:hidden" />
            <span className="text-sm font-medium">
              {mode === "onboarding" ? "Set up your identity" : "RepuH Assistant"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pending ? <Loader2 size={15} className="animate-spin text-muted" /> : null}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-xs text-muted hover:text-foreground"
            >
              {mode === "onboarding" ? "Skip to app" : "Dashboard"}
            </button>
          </div>
        </header>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-6 lg:px-8"
          aria-live="polite"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {messages.length === 0 ? (
              <div className="py-10 text-sm text-muted">
                Starting conversation…
              </div>
            ) : null}
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={cn(
                    "flex w-full",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-sm border px-4 py-3 text-sm leading-relaxed",
                      message.role === "user"
                        ? "border-primary/30 bg-primary-soft text-foreground"
                        : message.role === "system"
                          ? "border-border bg-surface-muted text-muted"
                          : "border-border bg-surface text-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {lastAssistant?.chips && lastAssistant.chips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {lastAssistant.chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChip(chip)}
                    disabled={pending}
                    className="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-foreground hover:bg-surface-muted disabled:opacity-45 press"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <form
          className="border-t border-border bg-background px-4 py-3 lg:px-8"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(input);
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit(input);
                }
              }}
              rows={1}
              placeholder={
                mode === "onboarding"
                  ? "Reply to the assistant…"
                  : "Type a command or question…"
              }
              className="min-h-[2.5rem] flex-1 resize-none rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Message"
            />
            <Button
              type="submit"
              size="md"
              aria-label={pending ? "Sending message" : "Send message"}
              disabled={pending || !input.trim()}
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </Button>
          </div>
          <p className="mx-auto mt-2 w-full max-w-3xl text-[0.6875rem] text-muted">
            {mode === "onboarding"
              ? "Answers are validated before saving. Nothing external is contacted until you choose it."
              : "Deterministic assistant. No account data leaves this browser except through the existing RepuH APIs."}
          </p>
        </form>
      </div>

      {mode === "control" ? (
        <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-surface lg:flex">
          <div className="border-b border-border px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Workspace</p>
            <p className="mt-1 text-sm text-foreground">Features beside the conversation</p>
          </div>
          <nav aria-label="Workspace features" className="grid grid-cols-2 gap-2 p-3">
            {[
              { id: "overview", label: "Overview", href: "/dashboard" },
              { id: "fingerprint", label: "Fingerprint", href: "/fingerprint" },
              { id: "roles", label: "Role coverage", href: "/roles" },
              { id: "activity", label: "Activity", href: "/activity" },
              { id: "evidence", label: "Evidence", href: "/evidence" },
              { id: "certificates", label: "Certificates", href: "/certificates" },
              { id: "leaderboards", label: "Leaderboards", href: "/leaderboards" },
              { id: "explore", label: "Explore", href: "/explore" },
              { id: "integrations", label: "Integrations", href: "/integrations" },
              { id: "settings", label: "Settings", href: "/settings" },
            ].map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => {
                  setActiveFeature(feature.id);
                  addMessage("assistant", `Opened ${feature.label} in the workspace.`);
                  router.push(feature.href);
                }}
                className={cn(
                  "rounded-sm border px-2 py-2 text-left text-xs transition-colors",
                  activeFeature === feature.id
                    ? "border-primary/40 bg-primary-soft text-foreground"
                    : "border-border bg-background text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {feature.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3"
              >
                {activeFeature === "overview" ? (
                  <div className="rounded-sm border border-border bg-background p-4 text-sm">
                    <p className="font-medium">Workspace overview</p>
                    <p className="mt-1 text-muted">
                      Evidence: {workspaceStats.evidence} · Certificates: {workspaceStats.certificates}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Use commands or feature tiles to move through RepuH without leaving the conversation.
                    </p>
                  </div>
                ) : null}
                {activeFeature === "roles" ? (
                  <div className="rounded-sm border border-border bg-background p-4 text-sm">
                    <p className="font-medium">Role coverage</p>
                    <p className="mt-1 text-muted">
                      Compare your evidence against role profiles and see the next gaps.
                    </p>
                    <Link href="/roles" className="mt-3 inline-block text-xs text-primary underline">
                      Open full role coverage
                    </Link>
                  </div>
                ) : null}
                {activeFeature !== "overview" && activeFeature !== "roles" ? (
                  <div className="rounded-sm border border-border bg-background p-4 text-sm">
                    <p className="font-medium capitalize">{activeFeature}</p>
                    <p className="mt-1 text-muted">
                      This surface stays one click away while the assistant keeps the conversation moving.
                    </p>
                    <Link
                      href={
                        activeFeature === "fingerprint"
                          ? "/fingerprint"
                          : activeFeature === "activity"
                            ? "/activity"
                            : activeFeature === "evidence"
                              ? "/evidence"
                              : activeFeature === "certificates"
                                ? "/certificates"
                                : activeFeature === "leaderboards"
                                  ? "/leaderboards"
                                  : activeFeature === "explore"
                                    ? "/explore"
                                    : activeFeature === "integrations"
                                      ? "/integrations"
                                      : "/settings"
                      }
                      className="mt-3 inline-block text-xs text-primary underline"
                    >
                      Open full page
                    </Link>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

// Avoid an unused import warning for HelpCircle/X by referencing them in a
// no-op type-only way is not needed; keep imports minimal instead.
void HelpCircle;
void X;
void MessageSquare;
