import { classifyEvent, type NormalizedEvent } from "@/lib/evidence/classify";
import { contentCommitment } from "@/lib/integrity/merkle";
import {
  insertEvent,
  insertEvidence,
  listEvidence,
  registerProject,
  saveSnapshots,
} from "@/lib/db/queries";
import { buildFingerprint, type EvidenceInput } from "@/lib/scoring";
import type { Evidence } from "@/lib/domain/types";

export interface IngestResult {
  created: boolean;
  evidenceId: string | null;
  skillIds: string[];
}

/**
 * Normalize → classify → persist. The operation is idempotent on
 * (user, source, externalId): re-running a sync cannot duplicate contributions.
 */
export function ingestEvent(
  userId: string,
  event: NormalizedEvent,
  options: { privacy?: "private" | "public" | "selective" } = {},
): IngestResult {
  const classification = classifyEvent(event);

  const { event: row, created } = insertEvent({
    userId,
    source: event.source,
    eventType: event.eventType,
    externalId: event.externalId,
    occurredAt: event.occurredAt,
    projectReference: event.projectReference,
    skillCandidates: classification.skillCandidates,
    attributionStatus: event.attribution,
    privacyStatus: options.privacy ?? "private",
    processingStatus: classification.skillCandidates.length > 0 ? "processed" : "skipped",
    payload: event.payload,
    isDemo: event.isDemo,
  });

  if (!created) {
    return { created: false, evidenceId: null, skillIds: [] };
  }

  if (event.projectReference) {
    registerProject(
      userId,
      event.projectReference,
      String(event.payload.repository ?? event.projectReference),
      event.source,
    );
  }

  const contentHash = contentCommitment({
    signal: classification.signal,
    occurredAt: event.occurredAt,
    skillIds: classification.skillCandidates,
    quality: classification.quality,
  });

  const evidence = insertEvidence({
    userId,
    eventId: row.id,
    title: classification.title,
    summary: classification.summary,
    signal: classification.signal,
    skillIds: classification.skillCandidates,
    quality: classification.quality,
    visibility: options.privacy ?? "private",
    contentHash,
    reasons: classification.reasons,
    limitations: classification.limitations,
    isDemo: event.isDemo,
  });

  return { created: true, evidenceId: evidence.id, skillIds: classification.skillCandidates };
}

export function evidenceToInput(evidence: Evidence): EvidenceInput {
  return {
    id: evidence.id,
    signal: evidence.signal,
    occurredAt: evidence.occurredAt,
    skills: evidence.skillIds,
    projects: evidence.projectReference ? [evidence.projectReference] : [],
    sources: [evidence.source],
    quality: evidence.quality,
    visibility: evidence.visibility,
  };
}

export function computeFingerprint(userId: string, now = new Date()) {
  const evidence = listEvidence(userId, { limit: 5000 });
  const inputs = evidence.map(evidenceToInput);
  return {
    fingerprint: buildFingerprint({ evidence: inputs, now }),
    evidence,
  };
}

/** Recompute and persist a snapshot generation. */
export function recomputeAndSnapshot(userId: string) {
  const { fingerprint } = computeFingerprint(userId);
  saveSnapshots(
    userId,
    fingerprint.skills.map((skill) => ({
      skillId: skill.skillId,
      estimate: skill.estimate,
      confidence: skill.confidence,
      evidenceCount: skill.evidenceCount,
      projectCount: skill.projectCount,
      status: skill.status,
      contributions: skill.contributions.slice(0, 8),
      algorithmVersion: skill.algorithmVersion,
    })),
  );
  return fingerprint;
}
