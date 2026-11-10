import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/crypto";
import {
  countUsers,
  createProfile,
  createUser,
  findUserByEmail,
  getProfile,
  getPreferences,
  markSynced,
  seedConsent,
  updatePreferences,
  upsertIntegration,
} from "@/lib/db/queries";
import {
  DEMO_PASSWORD,
  DEMO_PROFILES,
  buildDemoEvents,
  selfDemoSpec,
  type DemoProfileSpec,
} from "@/lib/demo/generator";
import { ingestEvent } from "@/lib/services/ingest";
import { recomputeAndSnapshot } from "@/lib/services/ingest";

function publicId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function seedProfile(spec: DemoProfileSpec) {
  const existing = findUserByEmail(spec.email);
  if (existing) return existing.id;

  const user = createUser({
    email: spec.email,
    passwordHash: hashPassword(DEMO_PASSWORD),
    verified: true,
  });

  createProfile({
    userId: user.id,
    displayName: spec.displayName,
    username: spec.username,
    headline: spec.headline,
    publicId: publicId(),
    visibility: spec.visibility,
    isDemo: true,
    onboardingComplete: true,
  });

  updatePreferences(user.id, {
    leaderboardOptIn: spec.visibility === "public",
    theme: "system",
  });
  seedConsent(user.id);

  upsertIntegration({
    userId: user.id,
    provider: "github",
    accountLogin: spec.username,
    scopes: ["public_repo", "read:user"],
    status: "demo",
  });
  markSynced(user.id, "github", null);

  for (const event of buildDemoEvents(spec)) {
    ingestEvent(user.id, event, { privacy: "public" });
  }
  recomputeAndSnapshot(user.id);
  return user.id;
}

/**
 * Creates the labelled demo network used by leaderboards, explore and public
 * profiles. Runs only when the development adapter is enabled and the database
 * has no accounts yet.
 */
export function seedDemoNetwork(): number {
  if (!env.demoMode) return 0;
  if (countUsers() > 0) return 0;
  for (const spec of DEMO_PROFILES) seedProfile(spec);
  return DEMO_PROFILES.length;
}

/** Applies the development adapter to a real account that explicitly asks. */
export function enableDemoForUser(userId: string) {
  const profile = getProfile(userId);
  if (!profile) throw new Error("Profile not found");

  const spec = selfDemoSpec({
    username: profile.username,
    displayName: profile.displayName,
    email: `${profile.username}@demo.local`,
    specialization: profile.specialization ?? "",
  });

  let created = 0;
  for (const event of buildDemoEvents(spec)) {
    const result = ingestEvent(userId, event, { privacy: profile.visibility });
    if (result.created) created += 1;
  }

  upsertIntegration({
    userId,
    provider: "github",
    accountLogin: `${profile.username} (demo)`,
    scopes: ["demo:read"],
    status: "demo",
  });
  markSynced(userId, "github", null);
  seedConsent(userId);
  const preferences = getPreferences(userId);
  updatePreferences(userId, { leaderboardOptIn: preferences.leaderboardOptIn });

  recomputeAndSnapshot(userId);
  return created;
}
