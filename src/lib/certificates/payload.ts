/**
 * The signed certificate payload.
 *
 * A certificate attests to a RepuH record at a point in time — not to a person's
 * ability in the abstract. It carries the estimate, the confidence, the
 * algorithm version and the limitations, so a reader cannot take the number
 * without the caveats.
 *
 * The payload excludes the Hedera anchor on purpose: the signature is over the
 * claim, and the anchor is a separate, append-only receipt for that claim's
 * hash. Adding an anchor later therefore does not invalidate the signature.
 */

import { canonicalize, sha256Hex } from "@/lib/integrity/merkle";

export const CERTIFICATE_VERSION = "repuh-certificate-1.0.0";
export const CERTIFICATE_TYPE = "repuh.certificate.v1";

export const CERTIFICATE_DISCLAIMER =
  "This certificate attests that RepuH recorded the stated evidence summary at the stated time under the stated algorithm version. It is not proof of employment, identity, or independent verification of the underlying work, and the estimate is not a grade.";

export interface CertificateClaim {
  skillId: string;
  skillName: string;
  categoryId: string;
  estimate: number;
  confidence: number;
  status: "provisional" | "established";
  evidenceCount: number;
  projectCount: number;
  sourceCount: number;
  algorithmVersion: string;
  limitations: string[];
}

export interface CertificatePayload {
  v: typeof CERTIFICATE_VERSION;
  type: typeof CERTIFICATE_TYPE;
  id: string;
  issuer: { name: "RepuH"; url: string | null };
  issuedAt: string;
  subject: { username: string; publicId: string; displayName: string };
  claim: CertificateClaim;
  evidence: { root: string; count: number; hashVersion: string };
  disclaimer: string;
}

export interface CertificateInput {
  id: string;
  issuedAt: string;
  issuerUrl: string | null;
  subject: { username: string; publicId: string; displayName: string };
  claim: CertificateClaim;
  evidenceRoot: string;
  evidenceCount: number;
}

export function buildCertificatePayload(input: CertificateInput): CertificatePayload {
  if (!/^[0-9a-f]{64}$/.test(input.evidenceRoot)) {
    throw new Error("Evidence root must be a 64-character lowercase hex digest");
  }
  if (input.claim.estimate < 0 || input.claim.estimate > 100) {
    throw new Error("Estimate must be between 0 and 100");
  }
  if (input.claim.confidence < 0 || input.claim.confidence > 1) {
    throw new Error("Confidence must be between 0 and 1");
  }
  if (!Number.isInteger(input.claim.evidenceCount) || input.claim.evidenceCount < 1) {
    throw new Error("A certificate needs at least one evidence item");
  }
  // The claim and the Merkle root must describe the same evidence set. A root
  // built over more items than the estimate counted would commit to evidence
  // that never contributed, and the certificate would state two different
  // counts for one claim.
  if (input.evidenceCount !== input.claim.evidenceCount) {
    throw new Error(
      "The Merkle root must cover exactly the evidence the estimate counted",
    );
  }

  return {
    v: CERTIFICATE_VERSION,
    type: CERTIFICATE_TYPE,
    id: input.id,
    issuer: { name: "RepuH", url: input.issuerUrl },
    issuedAt: input.issuedAt,
    subject: input.subject,
    claim: input.claim,
    evidence: {
      root: input.evidenceRoot,
      count: input.evidenceCount,
      hashVersion: "repuh-evidence-v1",
    },
    disclaimer: CERTIFICATE_DISCLAIMER,
  };
}

/** Canonical bytes are the signing input; hashing them yields the certificate id. */
export function certificateCanonical(payload: CertificatePayload): string {
  return canonicalize(payload);
}

export function certificateHash(payload: CertificatePayload): string {
  return sha256Hex(certificateCanonical(payload));
}

