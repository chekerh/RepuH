import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMerkleTree,
  canonicalize,
  evidenceCommitment,
  merkleProof,
  sha256Hex,
  verifyProof,
} from "../src/lib/integrity/merkle.ts";

test("canonical JSON is stable regardless of key order", () => {
  const a = canonicalize({ b: 2, a: 1, nested: { z: true, y: null } });
  const b = canonicalize({ nested: { y: null, z: true }, a: 1, b: 2 });
  assert.equal(a, b);
});

test("commitments are deterministic and exclude personal data", () => {
  const input = {
    evidenceId: "evd_123",
    signal: "merged_pull_request",
    occurredAt: "2026-01-01T00:00:00.000Z",
    contentHash: sha256Hex("classified-record"),
  };
  const first = evidenceCommitment(input);
  const second = evidenceCommitment({ ...input });
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.ok(!first.includes("evd_123"));
});

test("a single-leaf tree has a valid root", () => {
  const tree = buildMerkleTree(["a".repeat(64)]);
  assert.equal(tree.root, sha256Hex(`leaf:${"a".repeat(64)}`));
});

test("inclusion proofs verify for every leaf, including an odd count", () => {
  const commitments = ["1".repeat(64), "2".repeat(64), "3".repeat(64), "4".repeat(64), "5".repeat(64)];
  const tree = buildMerkleTree(commitments);

  for (let index = 0; index < commitments.length; index += 1) {
    const proof = merkleProof(tree, index);
    assert.equal(proof.root, tree.root);
    assert.equal(verifyProof(proof), true, `leaf ${index} should verify`);
  }
});

test("tampering with the leaf breaks verification", () => {
  const commitments = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
  const tree = buildMerkleTree(commitments);
  const proof = merkleProof(tree, 1);
  const tampered = { ...proof, leaf: sha256Hex("different") };
  assert.equal(verifyProof(tampered), false);
});

test("tampering with a sibling breaks verification", () => {
  const commitments = ["a".repeat(64), "b".repeat(64)];
  const tree = buildMerkleTree(commitments);
  const proof = merkleProof(tree, 0);
  const tampered = {
    ...proof,
    path: proof.path.map((step, index) =>
      index === 0 ? { ...step, hash: sha256Hex("not-the-sibling") } : step,
    ),
  };
  assert.equal(verifyProof(tampered), false);
});

test("root changes when a commitment changes", () => {
  const first = buildMerkleTree(["a".repeat(64), "b".repeat(64)]);
  const second = buildMerkleTree(["a".repeat(64), "c".repeat(64)]);
  assert.notEqual(first.root, second.root);
});

test("building an empty tree is refused", () => {
  assert.throws(() => buildMerkleTree([]));
});
