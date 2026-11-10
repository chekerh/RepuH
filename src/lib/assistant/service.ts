import { audit } from "@/lib/db";
import {
  getIntegration,
  listActivity,
  listCertificates,
  listEvidence,
  updatePreferences,
  updateProfile,
} from "@/lib/db/queries";
import type { SessionUser } from "@/lib/domain/types";
import { SKILLS, SKILLS_BY_ID } from "@/lib/ontology";
import { computeFingerprint } from "@/lib/services/ingest";
import { formatDate, initials, relativeTime } from "@/lib/utils";
import { commandFor, confirmFor, SURFACES, type Plan } from "./router";
import type { ActivityRow, Card, Reply, Signal, SurfaceId, WorkspaceContext } from "./types";

type ScoredSkill = {
  skillId: string;
  evidenceCount: number;
  confidence: number;
  estimate: number | null;
};

const EVENT_LABELS: Record<string, string> = {
  repository_created: "Repository",
  commit_activity: "Commits",
  pull_request_opened: "Pull request",
  pull_request_merged: "Merged",
  code_review_submitted: "Review",
  issue_created: "Issue",
  issue_resolved: "Resolved",
  documentation_contributed: "Documentation",
  release_published: "Release",
  website_session_observed: "Observation",
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

function activityRows(userId: string, limit: number): ActivityRow[] {
  return listActivity(userId, { limit }).map((event) => ({
    id: event.id,
    title: String(event.payload.title ?? EVENT_LABELS[event.eventType] ?? "Activity"),
    repo: event.projectReference,
    when: relativeTime(event.occurredAt),
    type: EVENT_LABELS[event.eventType] ?? event.eventType,
    demo: event.isDemo,
  }));
}

/** Rank by estimate, then confidence. Deliberately not a composite. */
function signalRows(skills: ScoredSkill[], limit: number): Signal[] {
  return [...skills]
    .filter((skill) => skill.evidenceCount > 0)
    .sort((a, b) => (b.estimate ?? 0) - (a.estimate ?? 0) || b.confidence - a.confidence)
    .slice(0, limit)
    .map((skill) => {
      const meta = SKILLS_BY_ID.get(skill.skillId);
      return {
        id: skill.skillId,
        name: meta?.name ?? skill.skillId,
        group: meta?.categoryId ?? "other",
        evidence: skill.evidenceCount,
        confidence: skill.confidence,
        estimate: skill.estimate,
      };
    });
}

export function loadWorkspace(user: SessionUser): WorkspaceContext {
  const { fingerprint } = computeFingerprint(user.id);
  const integration = getIntegration(user.id, "github");
  const certificates = listCertificates(user.id);

  return {
    displayName: user.profile.displayName,
    firstName: user.profile.displayName.split(/\s+/)[0] ?? user.profile.displayName,
    username: user.profile.username,
    initials: initials(user.profile.displayName),
    headline: user.profile.headline,
    specialization: user.profile.specialization,
    visibility: user.profile.visibility,
    leaderboardOptIn: user.preferences.leaderboardOptIn,
    demo: integration?.status === "demo",
    observing: Boolean(integration),
    lastSyncedAt: integration?.lastSyncedAt ?? null,
    established: fingerprint.totals.established,
    provisional: fingerprint.totals.provisional,
    evidenceCount: fingerprint.totals.evidenceCount,
    projectCount: fingerprint.totals.projectCount,
    meanConfidence: fingerprint.totals.meanConfidence,
    skillsWithEvidence: fingerprint.totals.skillsWithEvidence,
    skillsTotal: SKILLS.length,
    certificateCount: certificates.length,
    strongest: signalRows(fingerprint.skills, 4),
    recent: activityRows(user.id, 5),
  };
}

function statusReply(userId: string): Reply {
  const { fingerprint, evidence } = computeFingerprint(userId);
  const integration = getIntegration(userId, "github");
  const certificates = listCertificates(userId);

  if (evidence.length === 0) {
    return {
      text: integration
        ? "Observation is connected, but no evidence has been classified yet. Nothing is estimated until there is attributable work to read."
        : "Nothing is being observed, so there is no evidence and no estimate. Connect a source when you want the map to fill in.",
      cards: [{ kind: "navigate", label: "Open integrations", href: SURFACES.integrations.href }],
      suggestions: [
        { label: "What can you do?", command: "help" },
        { label: "Open overview", command: "open overview" },
      ],
    };
  }

  return {
    text: integration
      ? `Observation is ${integration.status === "demo" ? "running on labelled demo data" : "active"}. Last synchronization: ${relativeTime(integration.lastSyncedAt)}.`
      : "Observation is paused. Nothing new is recorded until you resume it in consent controls.",
    cards: [
      {
        kind: "stats",
        items: [
          {
            label: "Evidence",
            value: String(evidence.length),
            note: `across ${fingerprint.totals.projectCount} projects`,
          },
          { label: "Certificates", value: String(certificates.length) },
          {
            label: "Capabilities",
            value: `${fingerprint.totals.skillsWithEvidence}/${SKILLS.length}`,
            note: "with attributable evidence",
          },
          {
            label: "Mean confidence",
            value: pct(fingerprint.totals.meanConfidence),
            note: "separate from proficiency",
          },
        ],
      },
    ],
    suggestions: [
      { label: "Open fingerprint", command: "open fingerprint" },
      { label: "Summarise evidence", command: "summarise evidence" },
    ],
  };
}

function helpReply(): Reply {
  return {
    text: "Six things I can do. Every answer is computed from your records; no model is called.",
    cards: [
      {
        kind: "list",
        title: "Commands",
        rows: [
          { id: "status", primary: "status", secondary: "Observation state and counts" },
          {
            id: "open",
            primary: "open <section>",
            secondary: "overview, fingerprint, activity, evidence, certificates, roles, settings",
          },
          { id: "summarise", primary: "summarise profile | evidence | certificates" },
          {
            id: "visibility",
            primary: "make profile public | unlisted | private",
            tag: "asks first",
          },
          { id: "leaderboard", primary: "join leaderboard | leave leaderboard", tag: "asks first" },
          { id: "github", primary: "connect github" },
        ],
      },
    ],
    suggestions: [
      { label: "Status", command: "status" },
      { label: "Open overview", command: "open overview" },
    ],
  };
}

function openReply(userId: string, surface: SurfaceId): Reply {
  const target = SURFACES[surface];
  const navigate: Card = {
    kind: "navigate",
    label: `Open ${target.label} as a page`,
    href: target.href,
  };

  switch (surface) {
    case "overview":
    case "fingerprint": {
      const { fingerprint, evidence } = computeFingerprint(userId);
      return {
        text: `${fingerprint.totals.established} capabilities are established and ${fingerprint.totals.provisional} are provisional. Mean confidence is ${pct(fingerprint.totals.meanConfidence)}, and it is reported separately from proficiency.`,
        cards: [
          {
            kind: "stats",
            items: [
              {
                label: "Established",
                value: String(fingerprint.totals.established),
                note: "confidence ≥ 62% and independent corroboration",
              },
              {
                label: "Provisional",
                value: String(fingerprint.totals.provisional),
                note: "estimate available, corroboration incomplete",
              },
              {
                label: "Evidence",
                value: String(evidence.length),
                note: `across ${fingerprint.totals.projectCount} projects`,
              },
              { label: "Mean confidence", value: pct(fingerprint.totals.meanConfidence) },
            ],
          },
          {
            kind: "signals",
            title: "Strongest signals",
            subtitle: "Ranked by estimate, then confidence. Not a single overall score.",
            rows: signalRows(fingerprint.skills, 5),
          },
          navigate,
        ],
      };
    }
    case "activity": {
      const rows = activityRows(userId, 8);
      return {
        text: rows.length
          ? "Recent meaningful activity, newest first."
          : "No activity has been recorded. That is the honest state, not an error.",
        cards: [
          { kind: "activity", title: "Recent activity", rows, empty: "Nothing recorded yet." },
          navigate,
        ],
      };
    }
    case "evidence": {
      const evidence = listEvidence(userId, { limit: 12 });
      return {
        text: evidence.length
          ? `${evidence.length} evidence records, newest first.`
          : "No evidence records yet. Evidence appears once a connected source produces attributable work.",
        cards: [
          {
            kind: "list",
            title: "Evidence",
            empty: "Connect a source to create the first record.",
            rows: evidence.map((item) => ({
              id: item.id,
              primary: item.title,
              secondary: `${item.signal.replace(/_/g, " ")} · ${relativeTime(item.occurredAt)}`,
              tag: item.visibility,
            })),
          },
          navigate,
        ],
      };
    }
    case "certificates": {
      const certificates = listCertificates(userId);
      return {
        text: certificates.length
          ? `${certificates.length} certificates on record.`
          : "You hold no certificates. A certificate is issued for an established capability, and only when a receipt exists.",
        cards: [
          {
            kind: "list",
            title: "Certificates",
            empty: "Certificates appear once a capability is established.",
            rows: certificates.map((item) => ({
              id: item.id,
              primary: SKILLS_BY_ID.get(item.skillId)?.name ?? item.skillId,
              secondary: `issued ${formatDate(item.createdAt)} · anchor ${item.anchorStatus.replace(/_/g, " ")}`,
              tag: item.status,
            })),
          },
          navigate,
        ],
      };
    }
    default:
      return {
        text: `${target.label} opens as its own page.`,
        cards: [navigate],
      };
  }
}

function summariseReply(userId: string, topic: "profile" | "evidence" | "certificates"): Reply {
  if (topic === "certificates") {
    const certificates = listCertificates(userId);
    if (certificates.length === 0) {
      return {
        text: "You hold no certificates. Established capabilities are what qualify for one, and a certificate still carries its estimate, confidence and limits.",
      };
    }
    return {
      text: `You hold ${certificates.length} certificate${certificates.length === 1 ? "" : "s"}: ${certificates
        .map((item) => SKILLS_BY_ID.get(item.skillId)?.name ?? item.skillId)
        .join(", ")}.`,
    };
  }

  if (topic === "evidence") {
    const evidence = listEvidence(userId, { limit: 5000 });
    if (evidence.length === 0) return { text: "There is no evidence to summarise yet." };
    const bySignal = new Map<string, number>();
    for (const item of evidence) {
      bySignal.set(item.signal, (bySignal.get(item.signal) ?? 0) + 1);
    }
    const top = [...bySignal.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([signal, count]) => `${signal.replace(/_/g, " ")} (${count})`)
      .join(", ");
    const projects = new Set(evidence.map((item) => item.projectReference ?? item.id)).size;
    return {
      text: `${evidence.length} evidence records across ${projects} project${projects === 1 ? "" : "s"}. Most common: ${top}.`,
    };
  }

  const { fingerprint } = computeFingerprint(userId);
  const strongest = signalRows(fingerprint.skills, 1)[0];
  if (fingerprint.totals.evidenceCount === 0) {
    return {
      text: "No evidence has been classified, so no capability is estimated. Unestablished is the accurate state.",
    };
  }
  return {
    text: `${fingerprint.totals.established} established and ${fingerprint.totals.provisional} provisional capabilities from ${fingerprint.totals.evidenceCount} evidence records. ${
      strongest ? `Strongest signal: ${strongest.name} at ${pct(strongest.confidence)} confidence. ` : ""
    }${SKILLS.length - fingerprint.totals.skillsWithEvidence} capabilities remain unestablished.`,
  };
}

export function respond(userId: string, plan: Plan): Reply {
  switch (plan.action) {
    case "help":
      return helpReply();
    case "status":
      return statusReply(userId);
    case "open":
      return openReply(userId, plan.surface);
    case "summarise":
      return summariseReply(userId, plan.topic);
    case "connect-github":
      return {
        text: "GitHub is connected from the integrations page, where every scope is listed before anything is read. This surface does not start an authorisation flow on its own.",
        cards: [{ kind: "navigate", label: "Open integrations", href: SURFACES.integrations.href }],
      };
    case "visibility": {
      updateProfile(userId, { visibility: plan.visibility });
      audit({ userId, action: "assistant.visibility", metadata: { visibility: plan.visibility } });
      const label = plan.visibility === "selective" ? "unlisted" : plan.visibility;
      return {
        text: `Your profile is now ${label}. Private evidence, consent records and integration tokens stay outside the public projection.`,
        suggestions: [
          { label: "Open public profile", command: "open public profile" },
          { label: "Status", command: "status" },
        ],
      };
    }
    case "leaderboard": {
      updatePreferences(userId, { leaderboardOptIn: plan.optIn });
      audit({ userId, action: "assistant.leaderboard", metadata: { optIn: plan.optIn } });
      return {
        text: plan.optIn
          ? "You are on the leaderboards. Ranks are per capability and still require independently supported evidence."
          : "You have left the leaderboards. Your evidence is untouched.",
      };
    }
  }
}

/** The confirmation card for a mutating plan, or null for a read-only one. */
export function confirmationFor(plan: Plan): Card | null {
  const confirm = confirmFor(plan);
  if (!confirm) return null;
  return { kind: "confirm", ...confirm, command: commandFor(plan) };
}

export function unknownReply(command: string): Reply {
  return {
    text: `No command matches "${command.slice(0, 80)}". I answer a fixed set of commands rather than guessing at the rest.`,
    suggestions: [
      { label: "Help", command: "help" },
      { label: "Status", command: "status" },
      { label: "Open overview", command: "open overview" },
    ],
  };
}
