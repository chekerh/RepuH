/**
 * Deterministic scoring.
 *
 * The engine is intentionally boring: a pure function over evidence inputs.
 * Same inputs and same algorithm version always produce the same estimate, so
 * every published number can be recomputed and audited.
 *
 * It refuses to produce a number when evidence is insufficient. `estimate` is
 * null in that case — the product then says proficiency is not yet established
 * rather than showing a zero that reads like a judgement.
 */

import { SIGNALS, SKILLS_BY_ID, type EvidenceSignal } from "@/lib/ontology";

export const ALGORITHM_VERSION = "scoring-1.0.0";

/** Days for an evidence item's influence to halve. */
export const RECENCY_HALF_LIFE_DAYS = 180;

/** The denominator that controls how quickly the curve saturates. */
const SATURATION = 3.4;

/**
 * A single ordinary item can never carry a skill on its own. A merged pull
 * request is the one exception: it clears a review boundary, so it may open a
 * provisional read.
 */
const SINGLE_ITEM_SIGNAL = "merged_pull_request" as const;

export interface EvidenceInput {
  id: string;
  signal: EvidenceSignal;
  occurredAt: string;
  /** Skill ids explicitly mapped during classification. */
  skills: string[];
  /** Project references, used only for corroboration counts. */
  projects: string[];
  /** Sources such as `github` or `extension`. */
  sources: string[];
  /** 0–1, produced by the classifier from observable quality signals. */
  quality: number;
  visibility: "private" | "public" | "selective";
}

export interface Contribution {
  evidenceId: string;
  signal: EvidenceSignal;
  baseWeight: number;
  quality: number;
  recency: number;
  effective: number;
  occurredAt: string;
}

export type SkillStatus = "insufficient" | "provisional" | "established";

export interface SkillEstimate {
  skillId: string;
  /** null means: not enough evidence to state a proficiency. */
  estimate: number | null;
  confidence: number;
  status: SkillStatus;
  evidenceCount: number;
  projectCount: number;
  sourceCount: number;
  coverage: number;
  lastEvidenceAt: string | null;
  firstEvidenceAt: string | null;
  contributions: Contribution[];
  rationale: string[];
  limitations: string[];
  algorithmVersion: string;
}

export interface ScoreInput {
  evidence: EvidenceInput[];
  /** Injectable clock for reproducible tests and snapshots. */
  now?: Date;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function daysBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

export function recencyWeight(occurredAt: string, now: Date): number {
  const occurred = new Date(occurredAt);
  if (Number.isNaN(occurred.getTime())) return 0;
  const age = Math.max(0, daysBetween(now, occurred));
  return Math.pow(0.5, age / RECENCY_HALF_LIFE_DAYS);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Score one skill. Exported for tests and for the skill drawer, which shows the
 * exact same numbers the fingerprint does.
 */
export function scoreSkill(skillId: string, input: ScoreInput): SkillEstimate {
  const now = input.now ?? new Date();
  const skill = SKILLS_BY_ID.get(skillId);

  const relevant = input.evidence.filter((item) => item.skills.includes(skillId));
  const contributions: Contribution[] = [];
  const projects = new Set<string>();
  const sources = new Set<string>();

  let total = 0;
  let weightedQuality = 0;
  let lastEvidenceAt: string | null = null;
  let firstEvidenceAt: string | null = null;

  for (const item of relevant) {
    const signal = SIGNALS[item.signal];
    if (!signal) continue;
    // A skill only accepts signals the ontology declares credible for it.
    if (skill && !skill.signals.includes(item.signal)) continue;

    const recency = recencyWeight(item.occurredAt, now);
    const quality = clamp(item.quality, 0, 1);
    const effective = signal.baseWeight * quality * recency;

    total += effective;
    weightedQuality += quality * effective;

    item.projects.forEach((project) => project && projects.add(project));
    item.sources.forEach((source) => source && sources.add(source));

    if (!lastEvidenceAt || new Date(item.occurredAt) > new Date(lastEvidenceAt)) {
      lastEvidenceAt = item.occurredAt;
    }
    if (!firstEvidenceAt || new Date(item.occurredAt) < new Date(firstEvidenceAt)) {
      firstEvidenceAt = item.occurredAt;
    }

    contributions.push({
      evidenceId: item.id,
      signal: item.signal,
      baseWeight: signal.baseWeight,
      quality: round(quality, 3),
      recency: round(recency, 3),
      effective: round(effective, 3),
      occurredAt: item.occurredAt,
    });
  }

  contributions.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const evidenceCount = contributions.length;
  const projectCount = projects.size;
  const sourceCount = sources.size;
  const meanQuality = total > 0 ? weightedQuality / total : 0;

  // Corroboration: independent projects and sources matter more than volume.
  const projectCredit = 1 + 0.14 * Math.min(3, Math.max(0, projectCount - 1));
  const sourceCredit = 1 + 0.09 * Math.min(2, Math.max(0, sourceCount - 1));
  const weighted = total * projectCredit * sourceCredit;

  // Volume is capped by corroboration. Forty merged pull requests in one
  // project cannot reach the same place as ten spread across three projects.
  const volumeCap = 2.4 + 1.2 * projectCount + 0.5 * sourceCount;
  const cappedWeighted = Math.min(weighted, volumeCap);
  const rawEstimate = 100 * (1 - Math.exp(-cappedWeighted / SATURATION));

  // Span: evidence spread over months is more convincing than a single week.
  let spanDays = 0;
  if (firstEvidenceAt && lastEvidenceAt) {
    spanDays = daysBetween(new Date(firstEvidenceAt), new Date(lastEvidenceAt));
  }
  const spanCredit = clamp(Math.log10(1 + spanDays / 30) / 1.6, 0, 1);

  const volumeCredit = clamp(
    0.2 + 0.1 * evidenceCount + 0.06 * projectCount + 0.03 * sourceCount + 0.14 * spanCredit,
    0,
    0.95,
  );

  const confidence = clamp(volumeCredit * (0.55 + 0.45 * meanQuality), 0, 0.95);

  const insufficient =
    evidenceCount === 0 ||
    // One strong merged contribution is enough to open a provisional read, but
    // never enough to claim an established capability.
    (evidenceCount === 1 && contributions[0]?.signal !== SINGLE_ITEM_SIGNAL);

  const estimate = insufficient ? null : round(rawEstimate, 0);

  const status: SkillStatus =
    estimate === null
      ? "insufficient"
      : confidence >= 0.62 && evidenceCount >= 4 && projectCount >= 2
        ? "established"
        : "provisional";

  const rationale: string[] = [];
  if (estimate === null) {
    rationale.push(
      `Not enough attributable evidence to estimate ${skill?.name ?? skillId}. ${evidenceCount} matching item${evidenceCount === 1 ? "" : "s"} recorded.`,
    );
  } else {
    rationale.push(
      `Computed from ${evidenceCount} attributable evidence item${evidenceCount === 1 ? "" : "s"} across ${projectCount} project${projectCount === 1 ? "" : "s"} and ${sourceCount} source${sourceCount === 1 ? "" : "s"}.`,
    );
    const strongest = [...contributions].sort((a, b) => b.effective - a.effective)[0];
    if (strongest) {
      rationale.push(
        `Largest single contribution: ${SIGNALS[strongest.signal].label.toLowerCase()} (weight ${strongest.effective.toFixed(2)} after ${(strongest.recency * 100).toFixed(0)}% recency).`,
      );
    }
    rationale.push(
      `Recency half-life ${RECENCY_HALF_LIFE_DAYS} days; ${spanDays.toFixed(0)}-day evidence span.`,
    );
    if (cappedWeighted < weighted) {
      rationale.push(
        `Weighted input was capped at ${volumeCap.toFixed(1)} by corroboration (${projectCount} project${projectCount === 1 ? "" : "s"}, ${sourceCount} source${sourceCount === 1 ? "" : "s"}); additional volume does not raise the estimate.`,
      );
    }
  }

  const limitations: string[] = [];
  if (skill) limitations.push(skill.limitations);
  if (sourceCount === 1) {
    limitations.push(
      "All evidence comes from a single source, so independent corroboration is unavailable.",
    );
  }
  if (projectCount <= 1) {
    limitations.push(
      "Evidence comes from one project; the estimate may reflect that context rather than general capability.",
    );
  }
  if (status === "provisional") {
    limitations.push(
      "Provisional: AI-assisted classification has not been independently corroborated.",
    );
  }
  if (estimate !== null && confidence < 0.5) {
    limitations.push("Confidence is low; treat the estimate as a weak signal.");
  }

  return {
    skillId,
    estimate,
    confidence: round(confidence, 3),
    status,
    evidenceCount,
    projectCount,
    sourceCount,
    coverage: round(
      clamp(
        (unique([...projects]).length * 0.25 + unique([...sources]).length * 0.25 + Math.min(evidenceCount, 8) / 16) /
          1,
        0,
        1,
      ),
      2,
    ),
    lastEvidenceAt,
    firstEvidenceAt,
    contributions,
    rationale,
    limitations,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

export function scoreAll(input: ScoreInput): SkillEstimate[] {
  return Array.from(SKILLS_BY_ID.keys()).map((skillId) => scoreSkill(skillId, input));
}

export interface Fingerprint {
  skills: SkillEstimate[];
  byCategory: Array<{
    categoryId: string;
    skillIds: string[];
    established: number;
    provisional: number;
    insufficient: number;
  }>;
  totals: {
    skillsWithEvidence: number;
    established: number;
    provisional: number;
    evidenceCount: number;
    projectCount: number;
    meanConfidence: number;
  };
  algorithmVersion: string;
  generatedAt: string;
}

export function buildFingerprint(input: ScoreInput): Fingerprint {
  const skills = scoreAll(input);
  const withEvidence = skills.filter((skill) => skill.evidenceCount > 0);
  const scored = skills.filter((skill) => skill.estimate !== null);

  const projectSet = new Set<string>();
  for (const item of input.evidence) item.projects.forEach((p) => p && projectSet.add(p));

  const byCategory = Array.from(
    skills.reduce<Map<string, SkillEstimate[]>>((acc, skill) => {
      const categoryId = SKILLS_BY_ID.get(skill.skillId)?.categoryId ?? "other";
      const list = acc.get(categoryId) ?? [];
      list.push(skill);
      acc.set(categoryId, list);
      return acc;
    }, new Map()),
  ).map(([categoryId, list]) => ({
    categoryId,
    skillIds: list.map((skill) => skill.skillId),
    established: list.filter((skill) => skill.status === "established").length,
    provisional: list.filter((skill) => skill.status === "provisional").length,
    insufficient: list.filter((skill) => skill.status === "insufficient").length,
  }));

  return {
    skills,
    byCategory,
    totals: {
      skillsWithEvidence: withEvidence.length,
      established: skills.filter((skill) => skill.status === "established").length,
      provisional: skills.filter((skill) => skill.status === "provisional").length,
      evidenceCount: input.evidence.length,
      projectCount: projectSet.size,
      meanConfidence:
        scored.length === 0
          ? 0
          : round(
              scored.reduce((sum, skill) => sum + skill.confidence, 0) / scored.length,
              3,
            ),
    },
    algorithmVersion: ALGORITHM_VERSION,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}
