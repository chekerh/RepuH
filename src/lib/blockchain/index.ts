import {
  buildMerkleTree,
  merkleProof,
  verifyProof,
  type MerkleProof,
} from "@/lib/integrity/merkle";
import { commitmentOf, unanchoredEvidence } from "@/lib/integrity/anchoring";
import { createAnchor, listEvidence, listAnchors, findAnchor } from "@/lib/db/queries";
import type { Anchor } from "@/lib/domain/types";
import { hederaStatus, hederaReady, topicExplorerUrl } from "@/lib/hedera/config";
import { buildAnchorEnvelope, readMirrorMessage, submitAnchorEnvelope } from "@/lib/hedera/hcs";

export interface AnchorSubmission {
  status: Anchor["status"];
  txRef: string | null;
  network: string;
  topicId: string | null;
  sequenceNumber: number | null;
  consensusTimestamp: string | null;
}

export interface AnchorProvider {
  id: string;
  network: string;
  configured: boolean;
  submit(input: {
    root: string;
    batchId: number;
    leafCount: number;
    anchoredAt: string;
  }): Promise<AnchorSubmission>;
}

/**
 * Local adapter. Deterministic, auditable and explicitly not on-chain: the
 * reference is a local digest and the UI always labels it "local".
 */
export const localProvider: AnchorProvider = {
  id: "local",
  network: "repuh-local",
  configured: false,
  async submit(input) {
    return {
      status: "local",
      txRef: `local:${input.batchId}:${input.root.slice(0, 16)}`,
      network: "repuh-local",
      topicId: null,
      sequenceNumber: null,
      consensusTimestamp: null,
    };
  },
};

/**
 * Hedera Consensus Service adapter. Returns only after consensus, so status
 * `confirmed` means the network ordered the message, not that it was submitted.
 * A failure throws: no anchor row is written for a transaction that did not
 * reach consensus.
 */
export const hederaProvider: AnchorProvider = {
  id: "hedera-hcs",
  network: `hedera-${hederaStatus().network}`,
  get configured() {
    return hederaReady();
  },
  async submit(input) {
    const envelope = buildAnchorEnvelope({
      root: input.root,
      batchId: input.batchId,
      leafCount: input.leafCount,
      anchoredAt: input.anchoredAt,
    });
    const receipt = await submitAnchorEnvelope(envelope);
    return {
      status: "confirmed",
      txRef: receipt.transactionId,
      network: `hedera-${hederaStatus().network}`,
      topicId: receipt.topicId,
      sequenceNumber: receipt.sequenceNumber,
      consensusTimestamp: receipt.consensusTimestamp,
    };
  },
};

export function resolveProvider(): AnchorProvider {
  return hederaReady() ? hederaProvider : localProvider;
}

export function providerStatus() {
  const status = hederaStatus();
  const provider = resolveProvider();
  return {
    provider: provider.id,
    network: provider.network,
    configured: provider.configured,
    hedera: status,
    statement: provider.configured
      ? `Merkle roots are submitted to Hedera ${status.network} consensus service and recorded after the network returns a sequence number.`
      : "Hedera is not configured, so anchors are deterministic local commitments. They are not on a public network.",
  };
}

export async function anchorEvidence(userId: string): Promise<{
  anchor: Anchor;
  alreadyAnchored: number;
}> {
  const evidence = listEvidence(userId, { limit: 5000 });
  const existing = listAnchors(userId);
  const alreadyAnchored = existing.flatMap((anchor) => anchor.commitments);

  const pending = unanchoredEvidence(evidence, alreadyAnchored);
  if (pending.length === 0) {
    throw new Error("Every evidence item is already in a batch. Nothing was created.");
  }

  const commitments = pending.map((item) => commitmentOf(item));

  const tree = buildMerkleTree(commitments);
  const provider = resolveProvider();
  const anchoredAt = new Date().toISOString();
  const submission = await provider.submit({
    root: tree.root,
    batchId: existing.length + 1,
    leafCount: commitments.length,
    anchoredAt,
  });

  const anchor = createAnchor({
    userId,
    merkleRoot: tree.root,
    commitments,
    provider: provider.id,
    network: submission.network,
    status: submission.status,
    txRef: submission.txRef,
    topicId: submission.topicId,
    sequenceNumber: submission.sequenceNumber,
    consensusTimestamp: submission.consensusTimestamp,
  });

  return { anchor, alreadyAnchored: existing.length };
}

export function verifyInclusion(
  userId: string,
  batchId: number,
  commitment: string,
): { verified: boolean; proof: MerkleProof | null; reason: string } {
  const anchor = findAnchor(userId, batchId);
  if (!anchor) {
    return { verified: false, proof: null, reason: "No batch with that id belongs to this account." };
  }
  const index = anchor.commitments.indexOf(commitment);
  if (index === -1) {
    return {
      verified: false,
      proof: null,
      reason: "That commitment is not part of this batch.",
    };
  }
  const tree = buildMerkleTree(anchor.commitments);
  const proof = merkleProof(tree, index);
  const verified = verifyProof(proof) && proof.root === anchor.merkleRoot;
  return {
    verified,
    proof,
    reason: verified
      ? "Inclusion proof verifies against the batch root."
      : "Proof did not verify against the stored root.",
  };
}

/**
 * Independently re-read the anchored message from a public mirror node and
 * compare it with the stored root. Read-only; a mirror node outage is reported
 * as unverified, never as failure of the anchor itself.
 */
export async function verifyAnchorOnMirror(
  userId: string,
  batchId: number,
): Promise<{
  checked: boolean;
  matches: boolean;
  reason: string;
  consensusTimestamp: string | null;
}> {
  const anchor = findAnchor(userId, batchId);
  if (!anchor) {
    return { checked: false, matches: false, reason: "No batch with that id.", consensusTimestamp: null };
  }
  if (!anchor.topicId || anchor.sequenceNumber === null) {
    return {
      checked: false,
      matches: false,
      reason: "This batch has no Hedera topic message to check.",
      consensusTimestamp: null,
    };
  }
  const message = await readMirrorMessage(anchor.topicId, anchor.sequenceNumber);
  if (!message) {
    return {
      checked: false,
      matches: false,
      reason: "The mirror node could not be reached or returned no message. The anchor is unchanged.",
      consensusTimestamp: null,
    };
  }
  try {
    const parsed = JSON.parse(message.message) as { root?: string; batch?: number };
    const matches = parsed.root === anchor.merkleRoot && parsed.batch === anchor.batchId;
    return {
      checked: true,
      matches,
      reason: matches
        ? "The mirror node message matches the stored Merkle root and batch id."
        : "The mirror node message does not match the stored anchor.",
      consensusTimestamp: message.consensusTimestamp || null,
    };
  } catch {
    return {
      checked: true,
      matches: false,
      reason: "The mirrored message was not the expected JSON envelope.",
      consensusTimestamp: message.consensusTimestamp || null,
    };
  }
}

export function explorerUrlFor(anchor: Anchor): string | null {
  if (!anchor.topicId) return null;
  return topicExplorerUrl(anchor.topicId, anchor.sequenceNumber);
}

