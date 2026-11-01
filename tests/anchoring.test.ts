import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commitmentOf,
  unanchoredEvidence,
  type AnchorableEvidence,
} from "../src/lib/integrity/anchoring.ts";

const ITEMS: AnchorableEvidence[] = [
  {
    id: "ev-1",
    signal: "merged_pull_request",
    occurredAt: "2026-05-01T10:00:00.000Z",
    contentHash: "a".repeat(64),
  },
  {
    id: "ev-2",
    signal: "code_review",
    occurredAt: "2026-05-02T10:00:00.000Z",
    contentHash: "b".repeat(64),
  },
];

test("a commitment is derived from the evidence, not from its content hash", () => {
  const commitment = commitmentOf(ITEMS[0]!);
  assert.match(commitment, /^[0-9a-f]{64}$/);
  assert.notEqual(commitment, ITEMS[0]!.contentHash);
});

test("already anchored commitments are excluded from a new batch", () => {
  const pending = unanchoredEvidence(ITEMS, [commitmentOf(ITEMS[0]!)]);
  assert.deepEqual(
    pending.map((item) => item.id),
    ["ev-2"],
  );
});

test("nothing is pending when every commitment is anchored", () => {
  const pending = unanchoredEvidence(ITEMS, ITEMS.map(commitmentOf));
  assert.equal(pending.length, 0);
});
