/**
 * Selecting what still needs anchoring.
 *
 * An anchor stores *commitments*, not content hashes. Comparing a content hash
 * against a stored commitment silently re-anchors the same evidence forever, so
 * the comparison lives here where it can be tested.
 */

import { evidenceCommitment } from "@/lib/integrity/merkle";

export interface AnchorableEvidence {
  id: string;
  signal: string;
  occurredAt: string;
  contentHash: string;
}

export function commitmentOf(item: AnchorableEvidence): string {
  return evidenceCommitment({
    evidenceId: item.id,
    signal: item.signal,
    occurredAt: item.occurredAt,
    contentHash: item.contentHash,
  });
}

export function unanchoredEvidence<T extends AnchorableEvidence>(
  items: T[],
  existingCommitments: Iterable<string>,
): T[] {
  const anchored = new Set(existingCommitments);
  return items.filter((item) => !anchored.has(commitmentOf(item)));
}
