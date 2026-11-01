import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyEvent, type NormalizedEvent } from "../src/lib/evidence/classify.ts";

function event(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    source: "github",
    eventType: "pull_request_merged",
    externalId: "gh:1",
    occurredAt: "2026-05-01T10:00:00.000Z",
    projectReference: "acme/api",
    attribution: "self",
    payload: {},
    ...overrides,
  };
}

test("declared language maps to the language skill", () => {
  const result = classifyEvent(
    event({ payload: { language: "TypeScript", files: ["src/index.ts"] } }),
  );
  assert.ok(result.skillCandidates.includes("typescript"));
  assert.ok(result.reasons.some((reason) => reason.skillId === "typescript"));
});

test("a repository name never implies a language", () => {
  const result = classifyEvent(
    event({
      projectReference: "someone/python-and-rust-tools",
      payload: { repository: "someone/python-and-rust-tools", language: "TypeScript" },
    }),
  );
  assert.ok(result.skillCandidates.includes("typescript"));
  assert.ok(!result.skillCandidates.includes("python"));
  assert.ok(!result.skillCandidates.includes("rust"));
});

test("component files map to React and UI implementation", () => {
  const result = classifyEvent(
    event({ payload: { language: "TypeScript", files: ["src/components/Chart.tsx"] } }),
  );
  assert.ok(result.skillCandidates.includes("react"));
  assert.ok(result.skillCandidates.includes("ui-implementation"));
});

test("documentation paths map to the documentation skill", () => {
  const result = classifyEvent(
    event({
      eventType: "documentation_contributed",
      payload: { language: "TypeScript", files: ["docs/architecture.md"], reviewComments: 0 },
    }),
  );
  assert.ok(result.skillCandidates.includes("documentation"));
});

test("a review maps to code review even with no changed files", () => {
  const result = classifyEvent(
    event({
      eventType: "code_review_submitted",
      payload: { repository: "acme/api", reviewComments: 4, files: [] },
    }),
  );
  assert.equal(result.signal, "code_review");
  assert.ok(result.skillCandidates.includes("code-review"));
  assert.ok(result.quality > 0.55);
});

test("migrations map to SQL and database engineering", () => {
  const result = classifyEvent(
    event({ payload: { files: ["supabase/migrations/0002_evidence.sql"], language: "TypeScript" } }),
  );
  assert.ok(result.skillCandidates.includes("sql"));
  assert.ok(result.skillCandidates.includes("database-engineering"));
});

test("unverified attribution reduces quality and records a limitation", () => {
  const self = classifyEvent(event({ payload: { language: "Rust" } }));
  const unverified = classifyEvent(event({ attribution: "unverified", payload: { language: "Rust" } }));
  assert.ok(unverified.quality < self.quality);
  assert.ok(unverified.limitations.some((line) => line.toLowerCase().includes("attribution")));
});

test("an unmapped event is retained as activity with a stated limitation", () => {
  const result = classifyEvent(
    event({
      eventType: "repository_created",
      payload: { repository: "acme/unknown", language: null, files: [] },
    }),
  );
  assert.equal(result.skillCandidates.length, 0);
  assert.ok(result.limitations.some((line) => line.includes("activity only")));
});

test("quality stays within bounds", () => {
  for (const type of [
    "repository_created",
    "commit_activity",
    "pull_request_merged",
    "code_review_submitted",
    "release_published",
    "website_session_observed",
  ] as const) {
    const result = classifyEvent(
      event({
        eventType: type,
        payload: { language: "TypeScript", files: Array.from({ length: 40 }).map((_, i) => `f${i}.ts`) },
      }),
    );
    assert.ok(result.quality >= 0 && result.quality <= 0.96, `${type} quality out of bounds`);
  }
});
