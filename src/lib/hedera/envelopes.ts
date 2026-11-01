/**
 * The exact bytes RepuH submits to Hedera Consensus Service.
 *
 * Kept free of the SDK so the format can be unit-tested, reviewed and reproduced
 * without a network. Both envelopes stay inside the 1024-byte single-message
 * limit; a batch or certificate therefore either fits or is rejected before a
 * transaction is built.
 */

export const HCS_PROTOCOL = "repuh-hcs-1";
export const HCS_MESSAGE_LIMIT = 1024;

export interface AnchorEnvelope {
  v: typeof HCS_PROTOCOL;
  type: "repuh.anchor.v1";
  app: "repuh";
  root: string;
  batch: number;
  leaves: number;
  at: string;
}

export interface CertificateEnvelope {
  v: typeof HCS_PROTOCOL;
  type: "repuh.certificate.v1";
  app: "repuh";
  id: string;
  hash: string;
  root: string;
  skill: string;
  at: string;
}

export function enforceMessageLimit(message: string) {
  const bytes = Buffer.byteLength(message, "utf8");
  if (bytes > HCS_MESSAGE_LIMIT) {
    throw new Error(
      `HCS message is ${bytes} bytes; the single-message limit is ${HCS_MESSAGE_LIMIT}`,
    );
  }
}

export function buildAnchorEnvelope(input: {
  root: string;
  batchId: number;
  leafCount: number;
  anchoredAt: string;
}): AnchorEnvelope {
  if (!/^[0-9a-f]{64}$/.test(input.root)) {
    throw new Error("Merkle root must be a 64-character lowercase hex digest");
  }
  if (!Number.isInteger(input.batchId) || input.batchId < 1) {
    throw new Error("Batch id must be a positive integer");
  }
  if (!Number.isInteger(input.leafCount) || input.leafCount < 1) {
    throw new Error("A batch must contain at least one commitment");
  }
  const envelope: AnchorEnvelope = {
    v: HCS_PROTOCOL,
    type: "repuh.anchor.v1",
    app: "repuh",
    root: input.root,
    batch: input.batchId,
    leaves: input.leafCount,
    at: input.anchoredAt,
  };
  enforceMessageLimit(JSON.stringify(envelope));
  return envelope;
}

export function buildCertificateEnvelope(input: {
  id: string;
  hash: string;
  evidenceRoot: string;
  skillId: string;
  issuedAt: string;
}): CertificateEnvelope {
  if (!/^[0-9a-f]{64}$/.test(input.hash)) {
    throw new Error("Certificate hash must be a 64-character lowercase hex digest");
  }
  if (!/^[0-9a-f]{64}$/.test(input.evidenceRoot)) {
    throw new Error("Evidence root must be a 64-character lowercase hex digest");
  }
  const envelope: CertificateEnvelope = {
    v: HCS_PROTOCOL,
    type: "repuh.certificate.v1",
    app: "repuh",
    id: input.id,
    hash: input.hash,
    root: input.evidenceRoot,
    skill: input.skillId,
    at: input.issuedAt,
  };
  enforceMessageLimit(JSON.stringify(envelope));
  return envelope;
}
