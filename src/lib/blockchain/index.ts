import {
  buildMerkleTree,
  merkleProof,
  verifyProof,
  type MerkleProof,
} from "@/lib/integrity/merkle";
import {
  commitmentOf,
  contractBatchKey,
  nextBatchId,
  unanchoredEvidence,
} from "@/lib/integrity/anchoring";
import { createAnchor, listEvidence, listAnchors, findAnchor } from "@/lib/db/queries";
import type { Anchor } from "@/lib/domain/types";
import { hederaContractReady, hederaReady, hederaStatus, topicExplorerUrl } from "@/lib/hedera/config";
import { buildAnchorEnvelope, readMirrorMessage, submitAnchorEnvelope } from "@/lib/hedera/hcs";
import {
  contractExplorerUrl,
  readAnchorRoot,
  submitRootOnContract,
  transactionExplorerUrl,
} from "@/lib/hedera/contract";

export interface AnchorSubmission {
  status: Anchor["status"];
  txRef: string | null;
  network: string;
  topicId: string | null;
  sequenceNumber: number | null;
  consensusTimestamp: string | null;
  contractId: string | null;
  /** Decimal uint256 the root is stored under on-chain. */
  contractBatchId: string | null;
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
    contractBatchId?: bigint;
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
      contractId: null,
      contractBatchId: null,
    };
  },
};

/**
 * Smart contract adapter (Hedera Smart Contract Service).
 *
 * Calls `submitRoot(bytes32 root, uint256 batchId)` on the deployed
 * EvidenceAnchor contract. `confirmed` means the call returned SUCCESS and a
 * read-back returned the submitted root; the receipt alone is not enough.
 * A failure throws, so no anchor row is written for a call that did not land.
 */
export const hederaContractProvider: AnchorProvider = {
  id: "hedera-contract",
  network: `hedera-${hederaStatus().network}`,
  get configured() {
    return hederaContractReady();
  },
  async submit(input) {
    if (input.contractBatchId === undefined) {
      throw new Error("The contract batch key was not derived before submission");
    }
    const receipt = await submitRootOnContract({
      root: input.root,
      onChainBatchId: input.contractBatchId,
    });
    return {
      status: "confirmed",
      txRef: receipt.transactionId,
      network: `hedera-${hederaStatus().network}`,
      topicId: null,
      sequenceNumber: null,
      consensusTimestamp: receipt.consensusTimestamp,
      contractId: receipt.contractId,
      contractBatchId: input.contractBatchId.toString(10),
    };
  },
};

/**
 * Hedera Consensus Service adapter, used for evidence batches when no contract
 * is configured (and for certificate hashes elsewhere). Returns only after
 * consensus, so status `confirmed` means the network ordered the message.
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
      contractId: null,
      contractBatchId: null,
    };
  },
};

/**
 * Provider preference, kept pure so the precedence is testable without a
 * network: contract first, then consensus, then the local adapter.
 */
export function chooseProviderId(input: {
  contractReady: boolean;
  consensusReady: boolean;
}): "hedera-contract" | "hedera-hcs" | "local" {
  if (input.contractReady) return "hedera-contract";
  if (input.consensusReady) return "hedera-hcs";
  return "local";
}

export function resolveProvider(): AnchorProvider {
  const id = chooseProviderId({
    contractReady: hederaContractReady(),
    consensusReady: hederaReady(),
  });
  if (id === "hedera-contract") return hederaContractProvider;
  if (id === "hedera-hcs") return hederaProvider;
  return localProvider;
}

export function providerStatus() {
  const status = hederaStatus();
  const provider = resolveProvider();
  const statement =
    provider.id === "hedera-contract"
      ? `Merkle roots are submitted to the EvidenceAnchor contract ${status.contractId} on Hedera ${status.network} and recorded only after the call succeeds and the stored root reads back.`
      : provider.id === "hedera-hcs"
        ? `No contract is configured, so Merkle roots are submitted to Hedera ${status.network} consensus and recorded after the network returns a sequence number.`
        : "Hedera is not configured, so anchors are deterministic local commitments. They are not on a public network.";
  return {
    provider: provider.id,
    network: provider.network,
    configured: provider.configured,
    contractId: status.contractId,
    contractUrl: status.contractId ? contractExplorerUrl(status.contractId) : null,
    hedera: status,
    statement,
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
  // The local batch number and the on-chain key must be decided together: the
  // stored batch id is what a later read-back uses to find the root.
  const batchId = nextBatchId(existing);
  const submission = await provider.submit({
    root: tree.root,
    batchId,
    leafCount: commitments.length,
    anchoredAt,
    contractBatchId: contractBatchKey(userId, batchId),
  });

  const anchor = createAnchor({
    userId,
    batchId,
    merkleRoot: tree.root,
    commitments,
    provider: provider.id,
    network: submission.network,
    status: submission.status,
    txRef: submission.txRef,
    topicId: submission.topicId,
    sequenceNumber: submission.sequenceNumber,
    consensusTimestamp: submission.consensusTimestamp,
    contractId: submission.contractId,
    contractBatchId: submission.contractBatchId,
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
 * Independently re-read the anchor from the network and compare it with the
 * stored root. Read-only; an unreachable network is reported as unverified,
 * never as failure of the anchor itself.
 *
 * Contract anchors are read through `getRoot(batchId)`; consensus anchors
 * through the public mirror node. The two paths differ because the networks
 * store different things — a contract slot versus a topic message.
 */
export async function verifyAnchorOnChain(
  userId: string,
  batchId: number,
): Promise<{
  checked: boolean;
  matches: boolean;
  via: "contract" | "consensus" | null;
  reason: string;
  consensusTimestamp: string | null;
}> {
  const anchor = findAnchor(userId, batchId);
  if (!anchor) {
    return {
      checked: false,
      matches: false,
      via: null,
      reason: "No batch with that id.",
      consensusTimestamp: null,
    };
  }

  if (anchor.provider === "hedera-contract" && anchor.contractId && anchor.contractBatchId) {
    const read = await readAnchorRoot(anchor.contractId, BigInt(anchor.contractBatchId));
    if (!read.root) {
      return {
        checked: false,
        matches: false,
        via: "contract",
        reason: read.reason,
        consensusTimestamp: anchor.consensusTimestamp,
      };
    }
    const matches = read.root === anchor.merkleRoot;
    return {
      checked: true,
      matches,
      via: "contract",
      reason: matches
        ? `Contract ${anchor.contractId} returns the stored Merkle root for batch ${anchor.batchId}.`
        : "The contract returns a different root than the stored anchor.",
      consensusTimestamp: anchor.consensusTimestamp,
    };
  }

  if (!anchor.topicId || anchor.sequenceNumber === null) {
    return {
      checked: false,
      matches: false,
      via: null,
      reason: "This batch has no on-chain anchor to check.",
      consensusTimestamp: null,
    };
  }
  const message = await readMirrorMessage(anchor.topicId, anchor.sequenceNumber);
  if (!message) {
    return {
      checked: false,
      matches: false,
      via: "consensus",
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
      via: "consensus",
      reason: matches
        ? "The mirror node message matches the stored Merkle root and batch id."
        : "The mirror node message does not match the stored anchor.",
      consensusTimestamp: message.consensusTimestamp || null,
    };
  } catch {
    return {
      checked: true,
      matches: false,
      via: "consensus",
      reason: "The mirrored message was not the expected JSON envelope.",
      consensusTimestamp: message.consensusTimestamp || null,
    };
  }
}

export function explorerUrlFor(anchor: Anchor): string | null {
  if (anchor.contractId) {
    return anchor.txRef
      ? transactionExplorerUrl(anchor.txRef)
      : contractExplorerUrl(anchor.contractId);
  }
  if (!anchor.topicId) return null;
  return topicExplorerUrl(anchor.topicId, anchor.sequenceNumber);
}
