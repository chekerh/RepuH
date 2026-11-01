import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreSkill, buildFingerprint, type EvidenceInput } from "../src/lib/scoring/index.ts";

const NOW = new Date("2026-06-01T12:00:00.000Z");

function daysAgo(days: number) {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function item(overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    id: `ev-${Math.random().toString(36).slice(2, 8)}`,
    signal: "merged_pull_request",
    occurredAt: daysAgo(10),
    skills: ["typescript"],
    projects: ["acme/api"],
    sources: ["github"],
    quality: 0.8,
    visibility: "private",
    ...overrides,
  };
}

test("no evidence produces no estimate", () => {
  const result = scoreSkill("typescript", { evidence: [], now: NOW });
  assert.equal(result.estimate, null);
  assert.equal(result.status, "insufficient");
  assert.equal(result.evidenceCount, 0);
});

test("one commit is not enough to publish a number", () => {
  const result = scoreSkill("typescript", {
    evidence: [item({ signal: "commit_series" })],
    now: NOW,
  });
  assert.equal(result.estimate, null);
  assert.equal(result.status, "insufficient");
});

test("a single merged pull request opens a provisional estimate", () => {
  const result = scoreSkill("typescript", { evidence: [item()], now: NOW });
  assert.notEqual(result.estimate, null);
  assert.equal(result.status, "provisional");
  assert.ok(result.confidence < 0.62);
});

test("scoring is deterministic for identical input", () => {
  const evidence = [item({ id: "a" }), item({ id: "b" }), item({ id: "c" })];
  const first = scoreSkill("typescript", { evidence, now: NOW });
  const second = scoreSkill("typescript", { evidence, now: NOW });
  assert.deepEqual(first, second);
});

test("recency reduces the estimate for older evidence", () => {
  const recent = scoreSkill("typescript", {
    evidence: [item({ id: "r1" }), item({ id: "r2" })],
    now: NOW,
  });
  const old = scoreSkill("typescript", {
    evidence: [
      item({ id: "o1", occurredAt: daysAgo(700) }),
      item({ id: "o2", occurredAt: daysAgo(720) }),
    ],
    now: NOW,
  });
  assert.ok(recent.estimate !== null && old.estimate !== null);
  assert.ok(recent.estimate! > old.estimate!);
});

test("volume saturates instead of growing without bound", () => {
  const few = scoreSkill("typescript", {
    evidence: Array.from({ length: 4 }).map((_, index) => item({ id: `f${index}` })),
    now: NOW,
  });
  const many = scoreSkill("typescript", {
    evidence: Array.from({ length: 40 }).map((_, index) => item({ id: `m${index}` })),
    now: NOW,
  });
  assert.ok(few.estimate !== null && many.estimate !== null);
  assert.ok(many.estimate! > few.estimate!);
  assert.ok(many.estimate! <= 92, "saturation must keep the estimate honest");
});

test("skills only accept signals the ontology declares credible", () => {
  const result = scoreSkill("code-review", {
    evidence: [item({ signal: "documentation", skills: ["code-review"] })],
    now: NOW,
  });
  assert.equal(result.evidenceCount, 0);
  assert.equal(result.estimate, null);
});

test("corroboration across projects raises confidence", () => {
  const single = scoreSkill("typescript", {
    evidence: [item({ id: "p1" }), item({ id: "p2" }), item({ id: "p3" })],
    now: NOW,
  });
  const multi = scoreSkill("typescript", {
    evidence: [
      item({ id: "m1", projects: ["acme/api"] }),
      item({ id: "m2", projects: ["acme/web"] }),
      item({ id: "m3", projects: ["acme/infra"], sources: ["github"] }),
    ],
    now: NOW,
  });
  assert.ok(multi.confidence > single.confidence);
  assert.equal(multi.projectCount, 3);
});

test("fingerprint reports no aggregate skill score", () => {
  const fingerprint = buildFingerprint({
    evidence: [item({ id: "a" }), item({ id: "b" })],
    now: NOW,
  });
  assert.equal(fingerprint.totals.evidenceCount, 2);
  assert.ok(!("overall" in fingerprint.totals));
  assert.ok(fingerprint.skills.every((skill) => typeof skill.estimate !== "number" || skill.estimate >= 0));
});
