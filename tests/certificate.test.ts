import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import {
  buildCertificatePayload,
  certificateCanonical,
  certificateHash,
  CERTIFICATE_VERSION,
  type CertificateInput,
} from "../src/lib/certificates/payload.ts";
import { verifyCertificate } from "../src/lib/certificates/sign.ts";

const INPUT: CertificateInput = {
  id: "crt_0123456789abcdef",
  issuedAt: "2026-06-01T12:00:00.000Z",
  issuerUrl: "https://repuh.example",
  subject: {
    username: "aisha-dev",
    publicId: "abc123def456",
    displayName: "Aisha Rahman",
  },
  claim: {
    skillId: "typescript",
    skillName: "TypeScript",
    categoryId: "programming",
    estimate: 72,
    confidence: 0.68,
    status: "established",
    evidenceCount: 9,
    projectCount: 3,
    sourceCount: 2,
    algorithmVersion: "scoring-1.0.0",
    limitations: ["Language detection from repository metadata only."],
  },
  evidenceRoot: "a".repeat(64),
  evidenceCount: 9,
};

test("certificate payload is versioned and carries its limitations", () => {
  const payload = buildCertificatePayload(INPUT);
  assert.equal(payload.v, CERTIFICATE_VERSION);
  assert.equal(payload.claim.estimate, 72);
  assert.equal(payload.claim.confidence, 0.68);
  assert.equal(payload.claim.limitations.length, 1);
  assert.match(payload.disclaimer, /not proof of employment/i);
  assert.equal(payload.evidence.root, "a".repeat(64));
});

test("canonical payload and hash are stable for identical input", () => {
  const first = buildCertificatePayload(INPUT);
  const second = buildCertificatePayload({ ...INPUT });
  assert.equal(certificateCanonical(first), certificateCanonical(second));
  assert.equal(certificateHash(first), certificateHash(second));
  assert.match(certificateHash(first), /^[0-9a-f]{64}$/);
});

test("a different estimate changes the hash", () => {
  const base = buildCertificatePayload(INPUT);
  const altered = buildCertificatePayload({
    ...INPUT,
    claim: { ...INPUT.claim, estimate: 73 },
  });
  assert.notEqual(certificateHash(base), certificateHash(altered));
});

test("ed25519 signature verifies and a tampered claim fails", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const payload = buildCertificatePayload(INPUT);
  const signature = edSign(
    null,
    Buffer.from(certificateCanonical(payload), "utf8"),
    privateKey,
  ).toString("base64");

  assert.equal(verifyCertificate(payload, signature, publicKey), true);

  const tampered = buildCertificatePayload({
    ...INPUT,
    claim: { ...INPUT.claim, confidence: 0.95 },
  });
  assert.equal(verifyCertificate(tampered, signature, publicKey), false);
});

test("a certificate cannot be built without a valid evidence root", () => {
  assert.throws(() => buildCertificatePayload({ ...INPUT, evidenceRoot: "not-a-root" }));
});

test("a certificate cannot claim an out-of-range estimate", () => {
  assert.throws(() =>
    buildCertificatePayload({ ...INPUT, claim: { ...INPUT.claim, estimate: 140 } }),
  );
});

// Regression: the Merkle root used to be built from every record tagged with
// the skill, while the claim counted only the evidence scoring accepted. One
// certificate then stated two different evidence counts for the same claim.
test("the Merkle root must cover exactly the evidence the estimate counted", () => {
  assert.equal(
    buildCertificatePayload(INPUT).evidence.count,
    INPUT.claim.evidenceCount,
  );
  assert.throws(
    () => buildCertificatePayload({ ...INPUT, evidenceCount: INPUT.claim.evidenceCount + 5 }),
    /must cover exactly the evidence the estimate counted/,
  );
  assert.throws(
    () => buildCertificatePayload({ ...INPUT, evidenceCount: INPUT.claim.evidenceCount - 1 }),
    /must cover exactly the evidence the estimate counted/,
  );
});
