import assert from "node:assert/strict";
import { test } from "node:test";

import { SKILLS_BY_ID } from "../src/lib/ontology/index.ts";
import { ROLE_PROFILES, getRoleProfile } from "../src/lib/roles/index.ts";

test("role profiles only reference known skills", () => {
  for (const role of ROLE_PROFILES) {
    const seen = new Set<string>();
    assert.ok(role.requirements.length > 0);
    assert.ok(role.requirements.some((requirement) => requirement.importance === "core"));
    for (const requirement of role.requirements) {
      assert.ok(SKILLS_BY_ID.has(requirement.skillId), `${role.id} references unknown skill ${requirement.skillId}`);
      assert.ok(!seen.has(requirement.skillId), `${role.id} repeats ${requirement.skillId}`);
      seen.add(requirement.skillId);
    }
  }
});

test("getRoleProfile returns null for an unknown role", () => {
  assert.equal(getRoleProfile("not-a-role"), null);
  assert.equal(getRoleProfile("backend-engineer")?.id, "backend-engineer");
});
