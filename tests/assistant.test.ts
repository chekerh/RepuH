import assert from "node:assert/strict";
import test from "node:test";
import { isMutating, planCommand } from "../src/lib/assistant/router.ts";

test("status and help are exact commands, not prefixes of prose", () => {
  assert.deepEqual(planCommand("status"), { action: "status" });
  assert.deepEqual(planCommand("What can you do?"), { action: "help" });
  assert.equal(planCommand("status of the deploy"), null);
});

test("opening a section accepts the labels people actually type", () => {
  assert.deepEqual(planCommand("open fingerprint"), {
    action: "open",
    surface: "fingerprint",
  });
  assert.deepEqual(planCommand("Show my dashboard"), { action: "open", surface: "overview" });
  assert.deepEqual(planCommand("roles"), { action: "open", surface: "role-coverage" });
  assert.deepEqual(planCommand("take me to evidence"), {
    action: "open",
    surface: "evidence",
  });
});

test("visibility is parsed as a mutation and must be confirmed", () => {
  const plan = planCommand("Make my profile public");
  assert.deepEqual(plan, { action: "visibility", visibility: "public" });
  assert.ok(plan);
  assert.equal(isMutating(plan), true);
});

test("unlisted is stored as selective visibility", () => {
  assert.deepEqual(planCommand("set profile unlisted"), {
    action: "visibility",
    visibility: "selective",
  });
});

test("leaderboard opt-in and opt-out are distinct plans", () => {
  assert.deepEqual(planCommand("join the leaderboard"), {
    action: "leaderboard",
    optIn: true,
  });
  assert.deepEqual(planCommand("leave leaderboards"), {
    action: "leaderboard",
    optIn: false,
  });
});

test("read-only plans never require confirmation", () => {
  const status = planCommand("status");
  const opened = planCommand("open certificates");
  assert.ok(status);
  assert.ok(opened);
  assert.equal(isMutating(status), false);
  assert.equal(isMutating(opened), false);
});

test("unmatched text is not guessed at", () => {
  assert.equal(planCommand("why is my Python score low"), null);
  assert.equal(planCommand(""), null);
});
