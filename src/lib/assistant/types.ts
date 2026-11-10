/** Shared shapes for the assistant surface. Pure: no database, no network. */

export type SurfaceId =
  | "assistant"
  | "overview"
  | "fingerprint"
  | "role-coverage"
  | "activity"
  | "evidence"
  | "certificates"
  | "leaderboards"
  | "explore"
  | "integrations"
  | "help"
  | "settings"
  | "public-profile";

export type Visibility = "private" | "public" | "selective";

export type Signal = {
  id: string;
  name: string;
  group: string;
  evidence: number;
  confidence: number;
  estimate: number | null;
};

export type ActivityRow = {
  id: string;
  title: string;
  repo: string | null;
  when: string;
  type: string;
  demo: boolean;
};

export type Card =
  | { kind: "stats"; items: { label: string; value: string; note?: string }[] }
  | { kind: "signals"; title: string; subtitle?: string; rows: Signal[] }
  | { kind: "activity"; title: string; rows: ActivityRow[]; empty?: string }
  | {
      kind: "list";
      title: string;
      rows: { id: string; primary: string; secondary?: string; tag?: string }[];
      empty?: string;
    }
  | { kind: "navigate"; label: string; href: string }
  | { kind: "confirm"; label: string; description: string; command: string };

export type Suggestion = { label: string; command: string };

export type Reply = {
  text: string;
  cards?: Card[];
  suggestions?: Suggestion[];
  error?: boolean;
};

export type Message = Reply & { id: string; role: "user" | "assistant" };

/** Everything the workspace needs on first paint, loaded on the server. */
export type WorkspaceContext = {
  displayName: string;
  firstName: string;
  username: string;
  initials: string;
  headline: string | null;
  specialization: string | null;
  visibility: Visibility;
  leaderboardOptIn: boolean;
  demo: boolean;
  observing: boolean;
  lastSyncedAt: string | null;
  established: number;
  provisional: number;
  evidenceCount: number;
  projectCount: number;
  meanConfidence: number;
  skillsWithEvidence: number;
  skillsTotal: number;
  certificateCount: number;
  strongest: Signal[];
  recent: ActivityRow[];
};
