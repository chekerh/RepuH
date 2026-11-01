/**
 * Evidence classification.
 *
 * Deterministic and rule-based on purpose. Every mapping carries the rule that
 * produced it, so the skill drawer can explain why an item counted. The rules
 * read *metadata* (declared language, changed paths, review depth) and never
 * claim to have understood the change itself.
 */

import type { EvidenceSignal } from "@/lib/ontology";

export type NormalizedEventType =
  | "repository_created"
  | "commit_activity"
  | "pull_request_opened"
  | "pull_request_merged"
  | "code_review_submitted"
  | "issue_created"
  | "issue_resolved"
  | "documentation_contributed"
  | "release_published"
  | "website_session_observed";

export interface NormalizedEvent {
  source: "github" | "extension" | "manual";
  eventType: NormalizedEventType;
  externalId: string;
  occurredAt: string;
  projectReference: string | null;
  payload: Record<string, unknown>;
  /** Whether the platform could tie the event to the authenticated account. */
  attribution: "self" | "coauthored" | "unverified";
  isDemo?: boolean;
}

export interface ClassificationResult {
  signal: EvidenceSignal;
  skillCandidates: string[];
  quality: number;
  reasons: Array<{ skillId: string; rule: string }>;
  summary: string;
  title: string;
  limitations: string[];
}

const EXTENSION_SKILLS: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  java: "java",
  rs: "rust",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  sql: "sql",
};

const LANGUAGE_SKILLS: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  java: "java",
  rust: "rust",
  "c++": "cpp",
  cpp: "cpp",
  sql: "sql",
};

const EVENT_SIGNAL: Record<NormalizedEventType, EvidenceSignal> = {
  repository_created: "repository",
  commit_activity: "commit_series",
  pull_request_opened: "merged_pull_request",
  pull_request_merged: "merged_pull_request",
  code_review_submitted: "code_review",
  issue_created: "issue_resolution",
  issue_resolved: "issue_resolution",
  documentation_contributed: "documentation",
  release_published: "release",
  website_session_observed: "observation",
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function add(
  ordered: string[],
  reasons: Array<{ skillId: string; rule: string }>,
  skillId: string,
  rule: string,
) {
  if (!ordered.includes(skillId)) ordered.push(skillId);
  reasons.push({ skillId, rule });
}

/**
 * Detect languages from declared metadata and changed file extensions. A
 * repository *name* is never used, per REPUH-ONTO-002.
 */
function detectLanguages(payload: Record<string, unknown>) {
  const detected = new Map<string, string>();

  for (const language of asStringArray(payload.languages)) {
    const skillId = LANGUAGE_SKILLS[language.toLowerCase()];
    if (skillId) detected.set(skillId, `declared repository language: ${language}`);
  }

  const declared = asString(payload.language);
  if (declared) {
    const skillId = LANGUAGE_SKILLS[declared.toLowerCase()];
    if (skillId) detected.set(skillId, `repository metadata reports ${declared}`);
  }

  for (const file of asStringArray(payload.files)) {
    const extension = file.split(".").pop()?.toLowerCase() ?? "";
    const skillId = EXTENSION_SKILLS[extension];
    if (skillId) detected.set(skillId, `changed file extension .${extension}`);
  }

  return detected;
}

export function classifyEvent(event: NormalizedEvent): ClassificationResult {
  const signal = EVENT_SIGNAL[event.eventType];
  const skills: string[] = [];
  const reasons: Array<{ skillId: string; rule: string }> = [];
  const limitations: string[] = [];
  const files = asStringArray(event.payload.files);
  const topics = asStringArray(event.payload.topics).map((topic) => topic.toLowerCase());
  const additions = asNumber(event.payload.additions) ?? 0;
  const deletions = asNumber(event.payload.deletions) ?? 0;
  const reviewComments = asNumber(event.payload.reviewComments) ?? 0;

  // Language evidence ------------------------------------------------------
  for (const [skillId, rule] of detectLanguages(event.payload)) {
    add(skills, reasons, skillId, rule);
  }

  // Framework and surface evidence ----------------------------------------
  const hasTsx = files.some((file) => file.endsWith(".tsx") || file.endsWith(".jsx"));
  const framework = asString(event.payload.framework)?.toLowerCase();
  if (hasTsx || framework === "react") {
    add(skills, reasons, "react", "component files (.tsx/.jsx) changed");
    add(skills, reasons, "ui-implementation", "interface files changed");
  }
  if (framework === "nextjs" || files.some((file) => file.includes("next.config"))) {
    add(skills, reasons, "nextjs", "Next.js configuration or app directory changed");
  }
  if (files.some((file) => /styles?|\.css$|tailwind/.test(file))) {
    add(skills, reasons, "ui-implementation", "styling files changed");
    add(skills, reasons, "responsive-development", "styling files changed");
  }

  // Path-based rules -------------------------------------------------------
  if (files.some((file) => /(^|\/)(docs?|documentation)\//i.test(file) || /\.mdx?$/i.test(file))) {
    add(skills, reasons, "documentation", "documentation paths changed");
  }
  if (files.some((file) => /(^|\/)adr\//i.test(file))) {
    add(skills, reasons, "technical-decision-making", "architecture decision record changed");
    add(skills, reasons, "architecture-documentation", "architecture decision record changed");
  }
  if (files.some((file) => /openapi|swagger|schema\.(ts|json)|routes?\//i.test(file))) {
    add(skills, reasons, "api-development", "interface or route definition changed");
  }
  if (files.some((file) => /auth|session|oauth/i.test(file))) {
    add(skills, reasons, "authentication", "authentication path changed");
  }
  if (files.some((file) => /migrations?\/|\.sql$/i.test(file))) {
    add(skills, reasons, "sql", "migration or SQL file changed");
    add(skills, reasons, "database-engineering", "migration or SQL file changed");
  }
  if (files.some((file) => /\.github\/workflows|Dockerfile|docker-compose|terraform|k8s|helm/i.test(file))) {
    add(skills, reasons, "ci-cd", "pipeline configuration changed");
  }
  if (files.some((file) => /Dockerfile|docker-compose/i.test(file))) {
    add(skills, reasons, "docker", "container configuration changed");
  }
  if (files.some((file) => /terraform|pulumi|cloudformation/i.test(file))) {
    add(skills, reasons, "infrastructure-automation", "infrastructure-as-code changed");
    add(skills, reasons, "cloud-infrastructure", "infrastructure-as-code changed");
  }
  if (files.some((file) => /monitoring|telemetry|otel|datadog|sentry/i.test(file))) {
    add(skills, reasons, "monitoring", "observability configuration changed");
  }
  if (files.some((file) => /a11y|accessibility|aria/i.test(file))) {
    add(skills, reasons, "accessibility", "accessibility-specific file changed");
  }
  if (files.some((file) => /store|reducer|state\//i.test(file))) {
    add(skills, reasons, "state-management", "state module changed");
  }
  if (topics.includes("testing") || files.some((file) => /\.test\.|\.spec\./.test(file))) {
    // Tests are a quality signal, not a capability in this ontology.
    limitations.push("Test changes raise confidence in quality but are not themselves a skill node.");
  }

  // Event-type rules -------------------------------------------------------
  switch (event.eventType) {
    case "code_review_submitted":
      add(skills, reasons, "code-review", "the reviewer submitted a review");
      add(skills, reasons, "technical-communication", "a written review was submitted");
      if (reviewComments >= 3) {
        add(skills, reasons, "project-collaboration", "review contained multiple substantive comments");
      }
      break;
    case "documentation_contributed":
      add(skills, reasons, "documentation", "documentation contribution event");
      add(skills, reasons, "technical-communication", "documentation contribution event");
      break;
    case "release_published":
      add(skills, reasons, "deployment", "a versioned release was published");
      add(skills, reasons, "ci-cd", "a versioned release was published");
      break;
    case "issue_resolved":
      add(skills, reasons, "technical-communication", "an issue was resolved with a written account");
      break;
    case "pull_request_merged":
      add(skills, reasons, "project-collaboration", "a change was merged into a shared project");
      break;
    default:
      break;
  }

  // Architecture inference is deliberately conservative.
  if (files.length >= 12 && additions + deletions >= 600) {
    add(skills, reasons, "system-design", "large multi-file change");
    limitations.push(
      "A large diff is not evidence of good design; breadth alone cannot establish architectural judgement.",
    );
  }

  // Quality ----------------------------------------------------------------
  let quality = 0.5;
  switch (event.eventType) {
    case "pull_request_merged":
      quality = 0.72 + Math.min(0.16, files.length * 0.01);
      break;
    case "pull_request_opened":
      quality = 0.5;
      break;
    case "code_review_submitted":
      quality = 0.55 + Math.min(0.3, reviewComments * 0.06);
      break;
    case "commit_activity":
      quality = 0.48;
      break;
    case "documentation_contributed":
      quality = 0.6;
      break;
    case "issue_resolved":
      quality = 0.55;
      break;
    case "release_published":
      quality = 0.68;
      break;
    case "repository_created":
      quality = 0.3;
      break;
    case "website_session_observed":
      quality = 0.2;
      break;
  }

  if (event.attribution === "unverified") {
    quality *= 0.6;
    limitations.push("Attribution could not be verified against the connected account.");
  }
  if (event.attribution === "coauthored") {
    quality *= 0.9;
    limitations.push("Co-authored contribution; individual ownership is shared.");
  }

  quality = Math.round(Math.min(0.96, quality) * 100) / 100;

  if (skills.length === 0) {
    limitations.push(
      "No reliable skill mapping was found for this item; it is retained as activity only.",
    );
  }

  const title = buildTitle(event);
  const summary = buildSummary(event, skills);

  return {
    signal,
    skillCandidates: skills,
    quality,
    reasons,
    title,
    summary,
    limitations,
  };
}

function buildTitle(event: NormalizedEvent): string {
  const subject = asString(event.payload.title);
  if (subject) return subject;
  switch (event.eventType) {
    case "repository_created":
      return `Repository created: ${asString(event.payload.repository) ?? "unnamed"}`;
    case "commit_activity":
      return `Commit series in ${asString(event.payload.repository) ?? "a repository"}`;
    case "pull_request_opened":
      return `Pull request opened in ${asString(event.payload.repository) ?? "a repository"}`;
    case "pull_request_merged":
      return `Pull request merged in ${asString(event.payload.repository) ?? "a repository"}`;
    case "code_review_submitted":
      return `Code review submitted in ${asString(event.payload.repository) ?? "a repository"}`;
    case "issue_created":
      return `Issue created in ${asString(event.payload.repository) ?? "a repository"}`;
    case "issue_resolved":
      return `Issue resolved in ${asString(event.payload.repository) ?? "a repository"}`;
    case "documentation_contributed":
      return `Documentation contributed to ${asString(event.payload.repository) ?? "a project"}`;
    case "release_published":
      return `Release published${event.payload.version ? ` ${String(event.payload.version)}` : ""}`;
    case "website_session_observed":
      return `Session observed on ${asString(event.payload.domain) ?? "an allowlisted site"}`;
    default:
      return "Activity";
  }
}

function buildSummary(event: NormalizedEvent, skills: string[]): string {
  const repository = asString(event.payload.repository);
  const parts: string[] = [];
  if (repository) parts.push(repository);
  const files = asStringArray(event.payload.files);
  if (files.length > 0) parts.push(`${files.length} file${files.length === 1 ? "" : "s"} changed`);
  if (skills.length > 0) parts.push(`${skills.length} capability signal${skills.length === 1 ? "" : "s"}`);
  return parts.join(" · ") || "Normalized activity event";
}
