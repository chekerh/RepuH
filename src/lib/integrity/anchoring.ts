/**
 * Selecting what still needs anchoring, and the key a batch is anchored under.
 *
 * An anchor stores *commitments*, not content hashes. Comparing a content hash
 * against a stored commitment silently re-anchors the same evidence forever, so
 * the comparison lives here where it can be tested.
 */

import { createHash } from "node:crypto";
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

/**
 * The id a batch is stored under on-chain, as a uint256.
 *
 * `EvidenceAnchor` keys roots by one uint256, while RepuH numbers batches per
 * account. Sending the local batch number directly would make the second
 * account collide on batch 1 — the contract rejects a duplicate id, so that
 * account could never anchor. Domain-separating the account and the batch gives
 * every batch a globally unique, stable key that is still reproducible from the
 * stored row.
 */
export function contractBatchKey(userId: string, batchId: number): bigint {
  if (!userId) {
    throw new Error("A user id is required to derive an on-chain batch key");
  }
  if (!Number.isInteger(batchId) || batchId < 1) {
    throw new Error("Batch id must be a positive integer");
  }
  const digest = createHash("sha256")
    .update(`repuh.contract-batch.v1|${userId}|${batchId}`, "utf8")
    .digest();
  return BigInt(`0x${digest.toString("hex")}`);
}

/**
 * Next batch number for an account. Uses the highest existing batch rather than
 * the number of rows: a gap left by deletion must not produce an id that is
 * already on-chain and therefore rejected as a duplicate.
 */
export function nextBatchId(anchors: { batchId: number }[]): number {
  return anchors.reduce((highest, anchor) => Math.max(highest, anchor.batchId), 0) + 1;
}
