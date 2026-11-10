/**
 * Certificate issuance.
 *
 * A certificate is issued for one capability that already has a non-null
 * estimate. Issuance never computes a new score: it reads the deterministic
 * fingerprint and signs the record, which keeps the certificate and the profile
 * from disagreeing.
 */

import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { createCertificate, revokeCertificate as revokeCertificateRecord } from "@/lib/db/queries";
import { getProfile } from "@/lib/db/queries";
import { computeFingerprint } from "@/lib/services/ingest";
import { buildMerkleTree, evidenceCommitment } from "@/lib/integrity/merkle";
import { CATEGORY_BY_ID, SKILLS_BY_ID } from "@/lib/ontology";
import {
  buildCertificatePayload,
  certificateHash,
  type CertificatePayload,
} from "@/lib/certificates/payload";
import { buildCertificateEnvelope } from "@/lib/hedera/envelopes";
import { parseCertificatePayload, signCertificate, verifyCertificate } from "@/lib/certificates/sign";
import { hederaReady, hederaStatus } from "@/lib/hedera/config";
import { submitHcsMessage } from "@/lib/hedera/hcs";
import type { Certificate } from "@/lib/domain/types";

export class CertificateError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "insufficient" | "forbidden",
  ) {
    super(message);
    this.name = "CertificateError";
  }
}

export interface IssuedCertificate {
  certificate: Certificate;
  payload: CertificatePayload;
  verified: true;
  anchor: {
    status: Certificate["anchorStatus"];
    network: string;
    topicId: string | null;
    sequenceNumber: number | null;
    consensusTimestamp: string | null;
    transactionId: string | null;
    explorerUrl: string | null;
  };
  publicUrl: string | null;
}

export async function issueCertificate(
  userId: string,
  skillId: string,
): Promise<IssuedCertificate> {
  const profile = getProfile(userId);
  if (!profile) throw new CertificateError("Profile not found.", "not_found");

  const skill = SKILLS_BY_ID.get(skillId);
  if (!skill) throw new CertificateError("Unknown capability.", "not_found");
  const category = CATEGORY_BY_ID.get(skill.categoryId);

  const { fingerprint, evidence } = computeFingerprint(userId);
  const estimate = fingerprint.skills.find((entry) => entry.skillId === skillId);
  if (!estimate || estimate.estimate === null || estimate.status === "insufficient") {
    throw new CertificateError(
      "This capability has no established estimate yet. A certificate is only issued for a recorded number.",
      "insufficient",
    );
  }

  // The Merkle root must commit to exactly the evidence the estimate used, not
  // to every record tagged with the skill. Scoring rejects signals the ontology
  // does not declare credible for the skill, so a naive tag filter would anchor
  // items that never contributed — and the certificate would then state two
  // different evidence counts for one claim.
  const contributingIds = new Set(
    estimate.contributions.map((contribution) => contribution.evidenceId),
  );
  const items = evidence.filter((item) => contributingIds.has(item.id));
  if (items.length === 0 || items.length !== estimate.evidenceCount) {
    throw new CertificateError("No evidence items support this capability.", "insufficient");
  }

  const commitments = items.map((item) =>
    evidenceCommitment({
      evidenceId: item.id,
      signal: item.signal,
      occurredAt: item.occurredAt,
      contentHash: item.contentHash,
    }),
  );
  const tree = buildMerkleTree(commitments);

  const id = `crt_${randomUUID()}`;
  const issuedAt = new Date().toISOString();
  const publicUrlBase = env.appUrl || null;

  const payload = buildCertificatePayload({
    id,
    issuedAt,
    issuerUrl: publicUrlBase,
    subject: {
      username: profile.username,
      publicId: profile.publicId,
      displayName: profile.displayName,
    },
    claim: {
      skillId,
      skillName: skill.name,
      categoryId: skill.categoryId,
      estimate: estimate.estimate,
      confidence: estimate.confidence,
      status: estimate.status === "established" ? "established" : "provisional",
      evidenceCount: estimate.evidenceCount,
      projectCount: estimate.projectCount,
      sourceCount: estimate.sourceCount,
      algorithmVersion: estimate.algorithmVersion,
      limitations: [
        ...estimate.limitations,
        category
          ? `Category: ${category.name}. The estimate speaks only to this capability, not to overall engineering ability.`
          : "This estimate speaks only to this capability.",
      ],
    },
    evidenceRoot: tree.root,
    evidenceCount: items.length,
  });

  const hash = certificateHash(payload);
  const { signature, keyId } = signCertificate(payload);

  let anchorStatus: Certificate["anchorStatus"] = "unavailable";
  let anchorTopicId: string | null = null;
  let anchorSequence: number | null = null;
  let anchorTxRef: string | null = null;
  const network = `hedera-${hederaStatus().network}`;

  if (hederaReady()) {
    try {
      const receipt = await submitHcsMessage(
        buildCertificateEnvelope({
          id,
          hash,
          evidenceRoot: tree.root,
          skillId,
          issuedAt,
        }),
      );
      anchorStatus = "confirmed";
      anchorTopicId = receipt.topicId;
      anchorSequence = receipt.sequenceNumber;
      anchorTxRef = receipt.transactionId;
    } catch {
      // The signature stands on its own; a failed network write must not be
      // recorded as if it succeeded. The page says the anchor did not complete.
      anchorStatus = "failed";
    }
  }

  const certificate = createCertificate({
    id,
    userId,
    skillId,
    subjectUsername: profile.username,
    payload: JSON.stringify(payload),
    payloadHash: hash,
    signature,
    keyId,
    anchorNetwork: anchorStatus === "confirmed" ? network : null,
    anchorTopicId,
    anchorSequence,
    anchorTxRef,
    anchorStatus,
    evidenceRoot: tree.root,
  });

  const explorerBase = hederaStatus().explorerBase;
  return {
    certificate,
    payload,
    verified: true,
    anchor: {
      status: anchorStatus,
      network,
      topicId: anchorTopicId,
      sequenceNumber: anchorSequence,
      consensusTimestamp: null,
      transactionId: anchorTxRef,
      explorerUrl:
        anchorTopicId && anchorSequence !== null
          ? `${explorerBase}/topic/${anchorTopicId}?sequence=${anchorSequence}`
          : null,
    },
    publicUrl: publicUrlBase ? `${publicUrlBase}/certificate/${id}` : null,
  };
}

export type CertificateVerification =
  | {
      ok: true;
      certificate: Certificate;
      payload: CertificatePayload;
      signatureValid: boolean;
      hashValid: boolean;
      anchorStatus: Certificate["anchorStatus"];
      reason: string;
    }
  | { ok: false; reason: string };

/**
 * Re-derives the hash from the stored payload, checks the Ed25519 signature and
 * reports the anchor state separately. A certificate can be valid without an
 * anchor; it cannot be valid with a broken signature.
 */
export function verifyStoredCertificate(certificate: Certificate): CertificateVerification {
  const payload = parseCertificatePayload(certificate.payload);
  if (!payload) return { ok: false, reason: "The stored payload is not readable." };

  const hashValid = certificateHash(payload) === certificate.payloadHash;
  const signatureValid = verifyCertificate(payload, certificate.signature);

  return {
    ok: true,
    certificate,
    payload,
    signatureValid,
    hashValid,
    anchorStatus: certificate.anchorStatus,
    reason:
      certificate.status === "revoked"
        ? "This certificate has been revoked by its issuer."
        : signatureValid && hashValid
          ? "The signature matches the payload and the stored hash is consistent."
          : "The certificate failed verification: the payload, signature or hash does not match.",
  };
}

export function revokeCertificate(
  userId: string,
  certificateId: string,
  reason: string | null = null,
): Certificate | null {
  return revokeCertificateRecord(userId, certificateId, reason);
}
