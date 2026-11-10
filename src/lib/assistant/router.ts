import type { SurfaceId, Visibility } from "./types";

/**
 * Deterministic intent parser for the assistant.
 *
 * No model is invoked. The same text always produces the same plan, which is
 * what lets the interface promise that nothing in a reply was generated. Add a
 * new command by adding a parser rule here and a handler in ./service.
 */
export type Plan =
  | { action: "help" }
  | { action: "status" }
  | { action: "open"; surface: SurfaceId }
  | { action: "summarise"; topic: "profile" | "evidence" | "certificates" }
  | { action: "visibility"; visibility: Visibility }
  | { action: "leaderboard"; optIn: boolean }
  | { action: "connect-github" };

export const SURFACES: Record<SurfaceId, { label: string; href: string }> = {
  assistant: { label: "Assistant", href: "/assistant" },
  overview: { label: "Overview", href: "/dashboard" },
  fingerprint: { label: "My Fingerprint", href: "/fingerprint" },
  "role-coverage": { label: "Role coverage", href: "/roles" },
  activity: { label: "Activity", href: "/activity" },
  evidence: { label: "Evidence", href: "/evidence" },
  certificates: { label: "Certificates", href: "/certificates" },
  leaderboards: { label: "Leaderboards", href: "/leaderboards" },
  explore: { label: "Explore", href: "/explore" },
  integrations: { label: "Integrations", href: "/integrations" },
  help: { label: "Help", href: "/help" },
  settings: { label: "Settings", href: "/settings" },
  "public-profile": { label: "Public profile", href: "/profile" },
};

const ALIASES: Record<string, SurfaceId> = {
  assistant: "assistant",
  chat: "assistant",
  overview: "overview",
  dashboard: "overview",
  home: "overview",
  fingerprint: "fingerprint",
  "my fingerprint": "fingerprint",
  lattice: "fingerprint",
  roles: "role-coverage",
  "role coverage": "role-coverage",
  coverage: "role-coverage",
  activity: "activity",
  evidence: "evidence",
  certificates: "certificates",
  certificate: "certificates",
  certs: "certificates",
  leaderboards: "leaderboards",
  leaderboard: "leaderboards",
  explore: "explore",
  integrations: "integrations",
  integration: "integrations",
  help: "help",
  settings: "settings",
  "public profile": "public-profile",
  profile: "public-profile",
};

function clean(raw: string) {
  return raw.trim().toLowerCase().replace(/[?!.]+$/, "").replace(/\s+/g, " ");
}

/** A plan that changes account state must be confirmed before it runs. */
export function isMutating(plan: Plan): boolean {
  return plan.action === "visibility" || plan.action === "leaderboard";
}

export function confirmFor(plan: Plan): { label: string; description: string } | null {
  if (plan.action === "visibility") {
    const copy: Record<Visibility, { label: string; description: string }> = {
      public: {
        label: "Make profile public",
        description:
          "Anyone can find and open your public profile. Private evidence, consent records and integration tokens stay out of it.",
      },
      selective: {
        label: "Make profile unlisted",
        description: "Only people with the link can open your profile. It will not appear in search.",
      },
      private: {
        label: "Make profile private",
        description: "Only you can open your profile. The public address stops resolving.",
      },
    };
    return copy[plan.visibility];
  }
  if (plan.action === "leaderboard") {
    return plan.optIn
      ? {
          label: "Join leaderboards",
          description:
            "Your handle and per-capability ranks appear wherever independently supported evidence exists. There is no overall rank.",
        }
      : {
          label: "Leave leaderboards",
          description: "Your rows are removed from every leaderboard. Your evidence is untouched.",
        };
  }
  return null;
}

/** The command shown in a confirmation card, so confirming re-runs the same plan. */
export function commandFor(plan: Plan): string {
  switch (plan.action) {
    case "visibility":
      return plan.visibility === "selective"
        ? "make profile unlisted"
        : `make profile ${plan.visibility}`;
    case "leaderboard":
      return plan.optIn ? "join leaderboard" : "leave leaderboard";
    default:
      return "";
  }
}

export function planCommand(raw: string): Plan | null {
  const text = clean(raw);
  if (!text) return null;

  if (/^(help|commands|what can you do|what can i ask)$/.test(text)) {
    return { action: "help" };
  }
  if (/^(status|how am i doing|where do i stand)$/.test(text)) {
    return { action: "status" };
  }

  const visibility = text.match(
    /(?:make|set|change)\s+(?:my\s+)?profile\s+(?:to\s+)?(public|unlisted|private)/,
  );
  if (visibility) {
    const value = visibility[1];
    return {
      action: "visibility",
      visibility: value === "unlisted" ? "selective" : (value as Visibility),
    };
  }

  if (/(join|opt in|opt into|enable).*leaderboard/.test(text)) {
    return { action: "leaderboard", optIn: true };
  }
  if (/(leave|opt out|opt out of|disable|hide).*leaderboard/.test(text)) {
    return { action: "leaderboard", optIn: false };
  }

  if (/^(connect|link|add)\s+(?:my\s+)?github$/.test(text)) {
    return { action: "connect-github" };
  }

  const summary = text.match(/summari[sz]e\s+(?:my\s+)?(profile|evidence|certificates)/);
  if (summary) {
    return { action: "summarise", topic: summary[1] as "profile" | "evidence" | "certificates" };
  }

  const navigation = text.match(/^(?:open|show|go to|take me to|view)\s+(?:my\s+)?(.+)$/);
  const target = navigation ? navigation[1]! : text;
  const surface = ALIASES[target];
  if (surface) return { action: "open", surface };

  return null;
}
