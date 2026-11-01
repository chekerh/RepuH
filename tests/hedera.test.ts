import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HCS_MESSAGE_LIMIT,
  buildAnchorEnvelope,
  buildCertificateEnvelope,
} from "../src/lib/hedera/envelopes.ts";

const ROOT = "b".repeat(64);

test("anchor envelope carries only the root and batch metadata", () => {
  const envelope = buildAnchorEnvelope({
    root: ROOT,
    batchId: 3,
    leafCount: 52,
    anchoredAt: "2026-06-01T12:00:00.000Z",
  });

  assert.equal(envelope.type, "repuh.anchor.v1");
  assert.equal(envelope.root, ROOT);
  assert.equal(envelope.batch, 3);
  assert.equal(envelope.leaves, 52);

  const serialized = JSON.stringify(envelope);
  assert.ok(Buffer.byteLength(serialized, "utf8") <= HCS_MESSAGE_LIMIT);
  for (const forbidden of ["username", "email", "displayName", "estimate", "skill"]) {
    assert.ok(!serialized.includes(forbidden), `envelope must not contain ${forbidden}`);
  }
});

test("anchor envelope rejects an invalid root", () => {
  assert.throws(() =>
    buildAnchorEnvelope({ root: "xyz", batchId: 1, leafCount: 2, anchoredAt: "2026-06-01" }),
  );
});

test("anchor envelope rejects an empty batch", () => {
  assert.throws(() =>
    buildAnchorEnvelope({ root: ROOT, batchId: 1, leafCount: 0, anchoredAt: "2026-06-01" }),
  );
});

test("certificate envelope is small and identifies the certificate hash", () => {
  const hash = "c".repeat(64);
  const envelope = buildCertificateEnvelope({
    id: "crt_123",
    hash,
    evidenceRoot: ROOT,
    skillId: "typescript",
    issuedAt: "2026-06-01T12:00:00.000Z",
  });
  assert.equal(envelope.type, "repuh.certificate.v1");
  assert.equal(envelope.hash, hash);
  assert.ok(Buffer.byteLength(JSON.stringify(envelope), "utf8") <= HCS_MESSAGE_LIMIT);
});

test("certificate envelope rejects a malformed hash", () => {
  assert.throws(() =>
    buildCertificateEnvelope({
      id: "crt_123",
      hash: "short",
      evidenceRoot: ROOT,
      skillId: "typescript",
      issuedAt: "2026-06-01",
    }),
  );
});
