import { getDb, newId, nowIso, recordConsent } from "@/lib/db";
import type {
  ActivityEvent,
  Anchor,
  Certificate,
  Evidence,
  Integration,
  Preferences,
  Profile,
  Project,
  SessionUser,
  UserRecord,
  Visibility,
} from "@/lib/domain/types";
import type { EvidenceSignal } from "@/lib/ontology";
import type { NormalizedEventType } from "@/lib/evidence/classify";

/* ------------------------------------------------------------------ helpers */

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: string | null;
  created_at: string;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
  };
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  username: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
  profession: string;
  specialization: string | null;
  public_id: string;
  visibility: Visibility;
  onboarding_complete: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    headline: row.headline,
    bio: row.bio,
    country: row.country,
    avatarUrl: row.avatar_url,
    profession: row.profession,
    specialization: row.specialization,
    publicId: row.public_id,
    visibility: row.visibility,
    onboardingComplete: Boolean(row.onboarding_complete),
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* -------------------------------------------------------------------- users */

export function createUser(input: {
  email: string;
  passwordHash: string;
  verified?: boolean;
}): UserRecord {
  const db = getDb();
  const id = newId("usr");
  const timestamp = nowIso();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    id,
    input.email.toLowerCase(),
    input.passwordHash,
    input.verified ? timestamp : null,
    timestamp,
  );
  return {
    id,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    emailVerifiedAt: input.verified ? timestamp : null,
    createdAt: timestamp,
  };
}

export function findUserByEmail(email: string): UserRecord | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function findUserById(id: string): UserRecord | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function markEmailVerified(userId: string) {
  getDb()
    .prepare("UPDATE users SET email_verified_at = ? WHERE id = ?")
    .run(nowIso(), userId);
}

export function countUsers(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count;
}

/* ----------------------------------------------------------------- sessions */

export function createSession(input: {
  id: string;
  userId: string;
  expiresAt: string;
  userAgent?: string | null;
}) {
  getDb()
    .prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)",
    )
    .run(input.id, input.userId, nowIso(), input.expiresAt, input.userAgent ?? null);
}

export function findSession(sessionId: string): { userId: string; expiresAt: string } | null {
  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .get(sessionId) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(sessionId);
    return null;
  }
  return { userId: row.user_id, expiresAt: row.expires_at };
}

export function deleteSession(sessionId: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function deleteAllSessions(userId: string) {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function purgeExpiredSessions() {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(nowIso());
}

/* -------------------------------------------------------- profiles/prefs */

export function createProfile(input: {
  userId: string;
  displayName: string;
  username: string;
  publicId: string;
  profession?: string;
  visibility?: Visibility;
  isDemo?: boolean;
  headline?: string | null;
  onboardingComplete?: boolean;
}): Profile {
  const db = getDb();
  const timestamp = nowIso();
  db.prepare(
    `INSERT INTO profiles
      (user_id, display_name, username, headline, bio, country, avatar_url, profession, specialization,
       public_id, visibility, onboarding_complete, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.userId,
    input.displayName,
    input.username.toLowerCase(),
    input.headline ?? null,
    input.profession ?? "software-engineer",
    input.publicId,
    input.visibility ?? "private",
    input.onboardingComplete ? 1 : 0,
    input.isDemo ? 1 : 0,
    timestamp,
    timestamp,
  );
  db.prepare(
    "INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING",
  ).run(input.userId, timestamp);
  return getProfile(input.userId)!;
}

export function getProfile(userId: string): Profile | null {
  const row = getDb()
    .prepare("SELECT * FROM profiles WHERE user_id = ?")
    .get(userId) as ProfileRow | undefined;
  return row ? mapProfile(row) : null;
}

export function getProfileByUsername(username: string): Profile | null {
  const row = getDb()
    .prepare("SELECT * FROM profiles WHERE username = ?")
    .get(username.toLowerCase()) as ProfileRow | undefined;
  return row ? mapProfile(row) : null;
}

export function updateProfile(
  userId: string,
  patch: Partial<{
    displayName: string;
    headline: string | null;
    bio: string | null;
    country: string | null;
    avatarUrl: string | null;
    specialization: string | null;
    visibility: Visibility;
    onboardingComplete: boolean;
    username: string;
  }>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  const map: Record<string, string> = {
    displayName: "display_name",
    headline: "headline",
    bio: "bio",
    country: "country",
    avatarUrl: "avatar_url",
    specialization: "specialization",
    visibility: "visibility",
    username: "username",
  };
  for (const [key, column] of Object.entries(map)) {
    if (key in patch) {
      fields.push(`${column} = ?`);
      const value = (patch as Record<string, unknown>)[key];
      values.push(key === "username" && typeof value === "string" ? value.toLowerCase() : value);
    }
  }
  if ("onboardingComplete" in patch) {
    fields.push("onboarding_complete = ?");
    values.push(patch.onboardingComplete ? 1 : 0);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = ?");
  values.push(nowIso());
  values.push(userId);
  getDb().prepare(`UPDATE profiles SET ${fields.join(", ")} WHERE user_id = ?`).run(...values);
}

export function getPreferences(userId: string): Preferences {
  const row = getDb()
    .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
    .get(userId) as
    | {
        theme: Preferences["theme"];
        reduced_motion: number;
        notifications: number;
        language: string;
        leaderboard_opt_in: number;
      }
    | undefined;
  return {
    userId,
    theme: row?.theme ?? "system",
    reducedMotion: Boolean(row?.reduced_motion),
    notifications: row?.notifications === undefined ? true : Boolean(row.notifications),
    language: row?.language ?? "en",
    leaderboardOptIn: Boolean(row?.leaderboard_opt_in),
  };
}

export function updatePreferences(
  userId: string,
  patch: Partial<{
    theme: Preferences["theme"];
    reducedMotion: boolean;
    notifications: boolean;
    language: string;
    leaderboardOptIn: boolean;
  }>,
) {
  const db = getDb();
  const current = getPreferences(userId);
  const next = { ...current, ...patch };
  db.prepare(
    `INSERT INTO user_preferences (user_id, theme, reduced_motion, notifications, language, leaderboard_opt_in, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       theme = excluded.theme,
       reduced_motion = excluded.reduced_motion,
       notifications = excluded.notifications,
       language = excluded.language,
       leaderboard_opt_in = excluded.leaderboard_opt_in,
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    next.theme,
    next.reducedMotion ? 1 : 0,
    next.notifications ? 1 : 0,
    next.language,
    next.leaderboardOptIn ? 1 : 0,
    nowIso(),
  );
  db.prepare(
    `INSERT INTO leaderboard_preferences (user_id, opted_in, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET opted_in = excluded.opted_in, updated_at = excluded.updated_at`,
  ).run(userId, next.leaderboardOptIn ? 1 : 0, nowIso());
}

export function getSessionUser(userId: string): SessionUser | null {
  const user = findUserById(userId);
  const profile = getProfile(userId);
  if (!user || !profile) return null;
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    profile,
    preferences: getPreferences(userId),
  };
}

/* ------------------------------------------------------------ integrations */

interface IntegrationRow {
  id: string;
  user_id: string;
  provider: string;
  account_login: string | null;
  scopes: string;
  status: Integration["status"];
  last_synced_at: string | null;
  last_error: string | null;
  connected_at: string | null;
  created_at: string;
}

function mapIntegration(row: IntegrationRow): Integration {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accountLogin: row.account_login,
    scopes: parseJson<string[]>(row.scopes, []),
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    connectedAt: row.connected_at,
    createdAt: row.created_at,
  };
}

export function getIntegration(userId: string, provider: string): Integration | null {
  const row = getDb()
    .prepare("SELECT * FROM integrations WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as IntegrationRow | undefined;
  return row ? mapIntegration(row) : null;
}

export function listIntegrations(userId: string): Integration[] {
  const rows = getDb()
    .prepare("SELECT * FROM integrations WHERE user_id = ? ORDER BY provider")
    .all(userId) as IntegrationRow[];
  return rows.map(mapIntegration);
}

export function upsertIntegration(input: {
  userId: string;
  provider: string;
  accountLogin?: string | null;
  scopes?: string[];
  status: Integration["status"];
  accessTokenEncrypted?: string | null;
  lastError?: string | null;
}) {
  const existing = getIntegration(input.userId, input.provider);
  const timestamp = nowIso();
  if (existing) {
    getDb()
      .prepare(
        `UPDATE integrations SET account_login = COALESCE(?, account_login),
           scopes = COALESCE(?, scopes), status = ?, access_token_encrypted = COALESCE(?, access_token_encrypted),
           last_error = ?, connected_at = COALESCE(?, connected_at)
         WHERE user_id = ? AND provider = ?`,
      )
      .run(
        input.accountLogin ?? null,
        input.scopes ? JSON.stringify(input.scopes) : null,
        input.status,
        input.accessTokenEncrypted ?? null,
        input.lastError ?? null,
        input.status === "connected" ? timestamp : null,
        input.userId,
        input.provider,
      );
    return;
  }
  getDb()
    .prepare(
      `INSERT INTO integrations
        (id, user_id, provider, account_login, scopes, status, access_token_encrypted, last_synced_at, last_error, connected_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    )
    .run(
      newId("int"),
      input.userId,
      input.provider,
      input.accountLogin ?? null,
      JSON.stringify(input.scopes ?? []),
      input.status,
      input.accessTokenEncrypted ?? null,
      input.lastError ?? null,
      input.status === "connected" ? timestamp : null,
      timestamp,
    );
}

export function getIntegrationToken(userId: string, provider: string): string | null {
  const row = getDb()
    .prepare(
      "SELECT access_token_encrypted FROM integrations WHERE user_id = ? AND provider = ?",
    )
    .get(userId, provider) as { access_token_encrypted: string | null } | undefined;
  return row?.access_token_encrypted ?? null;
}

export function markSynced(userId: string, provider: string, error: string | null = null) {
  getDb()
    .prepare(
      "UPDATE integrations SET last_synced_at = ?, last_error = ?, status = ? WHERE user_id = ? AND provider = ?",
    )
    .run(nowIso(), error, error ? "error" : "connected", userId, provider);
}

export function deleteIntegration(userId: string, provider: string) {
  getDb()
    .prepare("DELETE FROM integrations WHERE user_id = ? AND provider = ?")
    .run(userId, provider);
}

export function registerProject(userId: string, reference: string, name: string, source: string) {
  getDb()
    .prepare(
      `INSERT INTO projects (id, user_id, reference, name, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, reference) DO NOTHING`,
    )
    .run(newId("prj"), userId, reference, name, source, nowIso());
}

export function listProjects(userId: string): Project[] {
  const rows = getDb()
    .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{
    id: string;
    user_id: string;
    reference: string;
    name: string;
    source: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    reference: row.reference,
    name: row.name,
    source: row.source,
    createdAt: row.created_at,
  }));
}

/* ----------------------------------------------------------------- activity */

interface ActivityRow {
  id: string;
  user_id: string;
  source: string;
  event_type: NormalizedEventType;
  external_id: string;
  occurred_at: string;
  received_at: string;
  project_reference: string | null;
  skill_candidates: string;
  attribution_status: ActivityEvent["attributionStatus"];
  privacy_status: Visibility;
  processing_status: ActivityEvent["processingStatus"];
  payload: string;
  is_demo: number;
}

function mapActivity(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    eventType: row.event_type,
    externalId: row.external_id,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    projectReference: row.project_reference,
    skillCandidates: parseJson<string[]>(row.skill_candidates, []),
    attributionStatus: row.attribution_status,
    privacyStatus: row.privacy_status,
    processingStatus: row.processing_status,
    payload: parseJson<Record<string, unknown>>(row.payload, {}),
    isDemo: Boolean(row.is_demo),
  };
}

export function insertEvent(input: {
  userId: string;
  source: string;
  eventType: NormalizedEventType;
  externalId: string;
  occurredAt: string;
  projectReference: string | null;
  skillCandidates: string[];
  attributionStatus: ActivityEvent["attributionStatus"];
  privacyStatus: Visibility;
  processingStatus: ActivityEvent["processingStatus"];
  payload: Record<string, unknown>;
  isDemo?: boolean;
}): { event: ActivityEvent; created: boolean } {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO activity_events
        (id, user_id, source, event_type, external_id, occurred_at, received_at, project_reference,
         skill_candidates, attribution_status, privacy_status, processing_status, payload, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId("evt"),
      input.userId,
      input.source,
      input.eventType,
      input.externalId,
      input.occurredAt,
      nowIso(),
      input.projectReference,
      JSON.stringify(input.skillCandidates),
      input.attributionStatus,
      input.privacyStatus,
      input.processingStatus,
      JSON.stringify(input.payload),
      input.isDemo ? 1 : 0,
    );

  const row = db
    .prepare(
      "SELECT * FROM activity_events WHERE user_id = ? AND source = ? AND external_id = ?",
    )
    .get(input.userId, input.source, input.externalId) as ActivityRow;
  return { event: mapActivity(row), created: result.changes > 0 };
}

export function listActivity(
  userId: string,
  options: { source?: string; eventType?: string; days?: number; limit?: number } = {},
): ActivityEvent[] {
  const clauses = ["user_id = ?"];
  const values: unknown[] = [userId];
  if (options.source && options.source !== "all") {
    clauses.push("source = ?");
    values.push(options.source);
  }
  if (options.eventType && options.eventType !== "all") {
    clauses.push("event_type = ?");
    values.push(options.eventType);
  }
  if (options.days && options.days > 0) {
    clauses.push("occurred_at >= ?");
    values.push(new Date(Date.now() - options.days * 86_400_000).toISOString());
  }
  values.push(options.limit ?? 100);
  const rows = getDb()
    .prepare(
      `SELECT * FROM activity_events WHERE ${clauses.join(" AND ")} ORDER BY occurred_at DESC LIMIT ?`,
    )
    .all(...values) as ActivityRow[];
  return rows.map(mapActivity);
}

export function activitySummary(userId: string) {
  const db = getDb();
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS last30,
              COUNT(DISTINCT project_reference) AS projects,
              COUNT(DISTINCT source) AS sources
       FROM activity_events WHERE user_id = ?`,
    )
    .get(new Date(Date.now() - 30 * 86_400_000).toISOString(), userId) as {
    total: number;
    last30: number | null;
    projects: number | null;
    sources: number | null;
  };
  const byType = db
    .prepare(
      "SELECT event_type AS type, COUNT(*) AS count FROM activity_events WHERE user_id = ? GROUP BY event_type ORDER BY count DESC",
    )
    .all(userId) as Array<{ type: string; count: number }>;
  const byMonth = db
    .prepare(
      `SELECT substr(occurred_at, 1, 7) AS month, COUNT(*) AS count
       FROM activity_events WHERE user_id = ? GROUP BY month ORDER BY month DESC LIMIT 6`,
    )
    .all(userId) as Array<{ month: string; count: number }>;

  return {
    total: totals.total ?? 0,
    last30: totals.last30 ?? 0,
    projects: totals.projects ?? 0,
    sources: totals.sources ?? 0,
    byType,
    byMonth: byMonth.reverse(),
  };
}

/* ----------------------------------------------------------------- evidence */

interface EvidenceRow {
  id: string;
  user_id: string;
  event_id: string;
  title: string;
  summary: string;
  signal: EvidenceSignal;
  skill_ids: string;
  quality: number;
  visibility: Visibility;
  verification_state: Evidence["verificationState"];
  content_hash: string;
  reasons: string;
  limitations: string;
  is_demo: number;
  created_at: string;
  occurred_at?: string;
  project_reference?: string | null;
  source?: string;
}

function mapEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    title: row.title,
    summary: row.summary,
    signal: row.signal,
    skillIds: parseJson<string[]>(row.skill_ids, []),
    quality: row.quality,
    visibility: row.visibility,
    verificationState: row.verification_state,
    contentHash: row.content_hash,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    reasons: parseJson<Array<{ skillId: string; rule: string }>>(row.reasons, []),
    limitations: parseJson<string[]>(row.limitations, []),
    occurredAt: row.occurred_at ?? row.created_at,
    projectReference: row.project_reference ?? null,
    source: row.source ?? "github",
  };
}

export function insertEvidence(input: {
  userId: string;
  eventId: string;
  title: string;
  summary: string;
  signal: EvidenceSignal;
  skillIds: string[];
  quality: number;
  visibility: Visibility;
  contentHash: string;
  reasons: Array<{ skillId: string; rule: string }>;
  limitations: string[];
  isDemo?: boolean;
}): Evidence {
  const id = newId("evd");
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO evidence
        (id, user_id, event_id, title, summary, signal, skill_ids, quality, visibility,
         verification_state, content_hash, reasons, limitations, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'provisional', ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.userId,
      input.eventId,
      input.title,
      input.summary,
      input.signal,
      JSON.stringify(input.skillIds),
      input.quality,
      input.visibility,
      input.contentHash,
      JSON.stringify(input.reasons),
      JSON.stringify(input.limitations),
      input.isDemo ? 1 : 0,
      nowIso(),
    );
  const row = getDb()
    .prepare(
      `SELECT e.*, a.occurred_at, a.project_reference, a.source
       FROM evidence e JOIN activity_events a ON a.id = e.event_id
       WHERE e.event_id = ?`,
    )
    .get(input.eventId) as EvidenceRow;
  return mapEvidence(row);
}

const EVIDENCE_SELECT = `SELECT e.*, a.occurred_at, a.project_reference, a.source
  FROM evidence e JOIN activity_events a ON a.id = e.event_id`;

export function listEvidence(
  userId: string,
  options: { visibility?: string; skillId?: string; limit?: number } = {},
): Evidence[] {
  const clauses = ["e.user_id = ?"];
  const values: unknown[] = [userId];
  if (options.visibility && options.visibility !== "all") {
    clauses.push("e.visibility = ?");
    values.push(options.visibility);
  }
  values.push(options.limit ?? 100);
  const rows = getDb()
    .prepare(`${EVIDENCE_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY a.occurred_at DESC LIMIT ?`)
    .all(...values) as EvidenceRow[];
  const mapped = rows.map(mapEvidence);
  if (!options.skillId) return mapped;
  return mapped.filter((item) => item.skillIds.includes(options.skillId!));
}

export function getEvidence(userId: string, evidenceId: string): Evidence | null {
  const row = getDb()
    .prepare(`${EVIDENCE_SELECT} WHERE e.id = ? AND e.user_id = ?`)
    .get(evidenceId, userId) as EvidenceRow | undefined;
  return row ? mapEvidence(row) : null;
}

export function countEvidence(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM evidence WHERE user_id = ?")
    .get(userId) as { count: number };
  return row.count;
}

export function updateEvidenceVisibility(
  userId: string,
  evidenceId: string,
  visibility: Visibility,
) {
  const result = getDb()
    .prepare("UPDATE evidence SET visibility = ? WHERE id = ? AND user_id = ?")
    .run(visibility, evidenceId, userId);
  return result.changes > 0;
}

export function markEvidenceDisputed(userId: string, evidenceId: string) {
  return (
    getDb()
      .prepare(
        "UPDATE evidence SET verification_state = 'disputed' WHERE id = ? AND user_id = ?",
      )
      .run(evidenceId, userId).changes > 0
  );
}

export function publicEvidenceFor(userId: string): Evidence[] {
  const rows = getDb()
    .prepare(
      `${EVIDENCE_SELECT} WHERE e.user_id = ? AND e.visibility IN ('public','selective')
       ORDER BY a.occurred_at DESC LIMIT 40`,
    )
    .all(userId) as EvidenceRow[];
  return rows.map(mapEvidence);
}

/* ---------------------------------------------------------------- snapshots */

export function saveSnapshots(
  userId: string,
  estimates: Array<{
    skillId: string;
    estimate: number | null;
    confidence: number;
    evidenceCount: number;
    projectCount: number;
    status: string;
    contributions: unknown;
    algorithmVersion: string;
  }>,
) {
  const db = getDb();
  const timestamp = nowIso();
  const insert = db.prepare(
    `INSERT INTO skill_snapshots
      (id, user_id, skill_id, estimate, confidence, evidence_count, project_count, status, inputs, algorithm_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const transaction = db.transaction(() => {
    for (const estimate of estimates) {
      if (estimate.evidenceCount === 0) continue;
      insert.run(
        newId("snp"),
        userId,
        estimate.skillId,
        estimate.estimate,
        estimate.confidence,
        estimate.evidenceCount,
        estimate.projectCount,
        estimate.status,
        JSON.stringify({ contributions: estimate.contributions }),
        estimate.algorithmVersion,
        timestamp,
      );
    }
  });
  transaction();
}

export function latestSnapshotAt(userId: string): string | null {
  const row = getDb()
    .prepare("SELECT MAX(created_at) AS at FROM skill_snapshots WHERE user_id = ?")
    .get(userId) as { at: string | null };
  return row.at;
}

export function snapshotHistory(userId: string, skillId: string, limit = 12) {
  const rows = getDb()
    .prepare(
      `SELECT created_at, estimate, confidence FROM skill_snapshots
       WHERE user_id = ? AND skill_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, skillId, limit) as Array<{
    created_at: string;
    estimate: number | null;
    confidence: number;
  }>;
  return rows.reverse().map((row) => ({
    createdAt: row.created_at,
    estimate: row.estimate,
    confidence: row.confidence,
  }));
}

/* -------------------------------------------------------------- leaderboard */

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  headline: string | null;
  specialization: string | null;
  isDemo: boolean;
  skillId: string;
  estimate: number;
  confidence: number;
  evidenceCount: number;
}

export function leaderboard(skillId: string, limit = 25): LeaderboardEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT s.user_id, s.skill_id, s.estimate, s.confidence, s.evidence_count,
              p.username, p.display_name, p.headline, p.specialization, p.is_demo
       FROM skill_snapshots s
       JOIN profiles p ON p.user_id = s.user_id
       JOIN leaderboard_preferences lp ON lp.user_id = s.user_id AND lp.opted_in = 1
       WHERE s.skill_id = ?
         AND s.estimate IS NOT NULL
         AND s.evidence_count >= 2
         AND p.visibility = 'public'
         AND s.created_at = (
           SELECT MAX(s2.created_at) FROM skill_snapshots s2
           WHERE s2.user_id = s.user_id AND s2.skill_id = s.skill_id
         )
       ORDER BY s.estimate DESC, s.confidence DESC
       LIMIT ?`,
    )
    .all(skillId, limit) as Array<{
    user_id: string;
    skill_id: string;
    estimate: number;
    confidence: number;
    evidence_count: number;
    username: string;
    display_name: string;
    headline: string | null;
    specialization: string | null;
    is_demo: number;
  }>;

  return rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    headline: row.headline,
    specialization: row.specialization,
    isDemo: Boolean(row.is_demo),
    skillId: row.skill_id,
    estimate: row.estimate,
    confidence: row.confidence,
    evidenceCount: row.evidence_count,
  }));
}

export function topSkillsFor(userId: string, limit = 3) {
  const rows = getDb()
    .prepare(
      `SELECT skill_id, estimate, confidence, evidence_count, status
       FROM skill_snapshots
       WHERE user_id = ? AND estimate IS NOT NULL
         AND created_at = (SELECT MAX(created_at) FROM skill_snapshots WHERE user_id = ?)
       ORDER BY estimate DESC, confidence DESC LIMIT ?`,
    )
    .all(userId, userId, limit) as Array<{
    skill_id: string;
    estimate: number;
    confidence: number;
    evidence_count: number;
    status: string;
  }>;
  return rows;
}

/* ------------------------------------------------------------ public profile */

export function publicProfiles(limit = 24): Profile[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM profiles WHERE visibility = 'public' AND onboarding_complete = 1 ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit) as ProfileRow[];
  return rows.map(mapProfile);
}

export function searchPublicProfiles(query: string, limit = 24): Profile[] {
  const like = `%${query.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM profiles
       WHERE visibility = 'public' AND onboarding_complete = 1
         AND (lower(display_name) LIKE ? OR lower(username) LIKE ? OR lower(COALESCE(headline,'')) LIKE ? OR lower(COALESCE(specialization,'')) LIKE ?)
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(like, like, like, like, limit) as ProfileRow[];
  return rows.map(mapProfile);
}

/* ---------------------------------------------------------------- anchors */

export function createAnchor(input: {
  userId: string;
  merkleRoot: string;
  commitments: string[];
  provider: string;
  network: string;
  status: Anchor["status"];
  txRef: string | null;
  topicId?: string | null;
  sequenceNumber?: number | null;
  consensusTimestamp?: string | null;
  contractId?: string | null;
}): Anchor {
  const db = getDb();
  const previous = db
    .prepare("SELECT MAX(batch_id) AS batch FROM blockchain_anchors WHERE user_id = ?")
    .get(input.userId) as { batch: number | null };
  const batchId = (previous.batch ?? 0) + 1;
  const id = newId("anc");
  db.prepare(
    `INSERT INTO blockchain_anchors
      (id, user_id, batch_id, merkle_root, provider, network, tx_ref, status, leaf_count,
       topic_id, sequence_number, consensus_timestamp, contract_id, commitments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    batchId,
    input.merkleRoot,
    input.provider,
    input.network,
    input.txRef,
    input.status,
    input.commitments.length,
    input.topicId ?? null,
    input.sequenceNumber ?? null,
    input.consensusTimestamp ?? null,
    input.contractId ?? null,
    JSON.stringify(input.commitments),
    nowIso(),
  );
  return {
    id,
    userId: input.userId,
    batchId,
    merkleRoot: input.merkleRoot,
    provider: input.provider,
    network: input.network,
    txRef: input.txRef,
    status: input.status,
    leafCount: input.commitments.length,
    topicId: input.topicId ?? null,
    sequenceNumber: input.sequenceNumber ?? null,
    consensusTimestamp: input.consensusTimestamp ?? null,
    contractId: input.contractId ?? null,
    commitments: input.commitments,
    createdAt: nowIso(),
  };
}

export function listAnchors(userId: string): Anchor[] {
  const rows = getDb()
    .prepare("SELECT * FROM blockchain_anchors WHERE user_id = ? ORDER BY batch_id DESC")
    .all(userId) as Array<{
    id: string;
    user_id: string;
    batch_id: number;
    merkle_root: string;
    provider: string;
    network: string;
    tx_ref: string | null;
    status: Anchor["status"];
    leaf_count: number;
    topic_id: string | null;
    sequence_number: number | null;
    consensus_timestamp: string | null;
    contract_id: string | null;
    commitments: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    batchId: row.batch_id,
    merkleRoot: row.merkle_root,
    provider: row.provider,
    network: row.network,
    txRef: row.tx_ref,
    status: row.status,
    leafCount: row.leaf_count,
    topicId: row.topic_id,
    sequenceNumber: row.sequence_number,
    consensusTimestamp: row.consensus_timestamp,
    contractId: row.contract_id,
    commitments: parseJson<string[]>(row.commitments, []),
    createdAt: row.created_at,
  }));
}

/* ------------------------------------------------------------- certificates */

interface CertificateRow {
  id: string;
  user_id: string;
  skill_id: string;
  subject_username: string;
  payload: string;
  payload_hash: string;
  signature: string;
  key_id: string;
  status: Certificate["status"];
  revoked_at: string | null;
  revocation_reason: string | null;
  anchor_network: string | null;
  anchor_topic_id: string | null;
  anchor_sequence: number | null;
  anchor_tx_ref: string | null;
  anchor_status: Certificate["anchorStatus"];
  evidence_root: string;
  created_at: string;
}

function mapCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    userId: row.user_id,
    skillId: row.skill_id,
    subjectUsername: row.subject_username,
    payload: row.payload,
    payloadHash: row.payload_hash,
    signature: row.signature,
    keyId: row.key_id,
    status: row.status,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    anchorNetwork: row.anchor_network,
    anchorTopicId: row.anchor_topic_id,
    anchorSequence: row.anchor_sequence,
    anchorTxRef: row.anchor_tx_ref,
    anchorStatus: row.anchor_status,
    evidenceRoot: row.evidence_root,
    createdAt: row.created_at,
  };
}

export function createCertificate(input: {
  id: string;
  userId: string;
  skillId: string;
  subjectUsername: string;
  payload: string;
  payloadHash: string;
  signature: string;
  keyId: string;
  anchorNetwork: string | null;
  anchorTopicId: string | null;
  anchorSequence: number | null;
  anchorTxRef: string | null;
  anchorStatus: Certificate["anchorStatus"];
  evidenceRoot: string;
}): Certificate {
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO certificates
        (id, user_id, skill_id, subject_username, payload, payload_hash, signature, key_id, status,
         anchor_network, anchor_topic_id, anchor_sequence, anchor_tx_ref, anchor_status, evidence_root, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.userId,
      input.skillId,
      input.subjectUsername,
      input.payload,
      input.payloadHash,
      input.signature,
      input.keyId,
      input.anchorNetwork,
      input.anchorTopicId,
      input.anchorSequence,
      input.anchorTxRef,
      input.anchorStatus,
      input.evidenceRoot,
      createdAt,
    );

  return {
    ...input,
    status: "active",
    revokedAt: null,
    revocationReason: null,
    createdAt,
  };
}

export function listCertificates(userId: string): Certificate[] {
  const rows = getDb()
    .prepare("SELECT * FROM certificates WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as CertificateRow[];
  return rows.map(mapCertificate);
}

export function revokeCertificate(
  userId: string,
  certificateId: string,
  reason: string | null = null,
): Certificate | null {
  const certificate = findCertificate(certificateId);
  if (!certificate || certificate.userId !== userId) return null;
  if (certificate.status === "revoked") return certificate;

  const changes = getDb()
    .prepare(
      "UPDATE certificates SET status = 'revoked', revoked_at = ?, revocation_reason = ? WHERE id = ? AND user_id = ? AND status = 'active'",
    )
    .run(nowIso(), reason, certificateId, userId).changes;

  if (changes === 0) return null;
  return findCertificate(certificateId);
}

export function listRevokedCertificates(): Array<{
  id: string;
  revokedAt: string | null;
  reason: string | null;
}> {
  const rows = getDb()
    .prepare(
      "SELECT id, revoked_at, revocation_reason FROM certificates WHERE status = 'revoked' ORDER BY revoked_at DESC",
    )
    .all() as Array<{ id: string; revoked_at: string | null; revocation_reason: string | null }>;
  return rows.map((row) => ({
    id: row.id,
    revokedAt: row.revoked_at,
    reason: row.revocation_reason,
  }));
}
export function findCertificate(id: string): Certificate | null {
  const row = getDb().prepare("SELECT * FROM certificates WHERE id = ?").get(id) as
    | CertificateRow
    | undefined;
  return row ? mapCertificate(row) : null;
}

/** Public listing used by the profile projection: active certificates only. */
export function listPublicCertificates(userId: string): Certificate[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM certificates WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
    )
    .all(userId) as CertificateRow[];
  return rows.map(mapCertificate);
}

export function findAnchor(userId: string, batchId: number): Anchor | null {
  return listAnchors(userId).find((anchor) => anchor.batchId === batchId) ?? null;
}

export function latestConsents(userId: string): Record<string, boolean> {
  const rows = getDb()
    .prepare(
      `SELECT c.purpose, c.granted
       FROM consent_records c
       JOIN (
         SELECT purpose, MAX(created_at) AS created_at
         FROM consent_records WHERE user_id = ? GROUP BY purpose
       ) latest ON latest.purpose = c.purpose AND latest.created_at = c.created_at
       WHERE c.user_id = ?`,
    )
    .all(userId, userId) as Array<{ purpose: string; granted: number }>;
  const result: Record<string, boolean> = {};
  for (const row of rows) result[row.purpose] = Boolean(row.granted);
  return result;
}

/* ------------------------------------------------------------- api tokens */
export function createApiToken(input: {
  id: string;
  userId: string;
  tokenHash: string;
  label: string;
  expiresAt: string;
}) {
  getDb()
    .prepare(
      "INSERT INTO api_tokens (id, user_id, token_hash, label, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(input.id, input.userId, input.tokenHash, input.label, nowIso(), input.expiresAt);
}

export function findApiToken(tokenHash: string): { userId: string } | null {
  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM api_tokens WHERE token_hash = ?")
    .get(tokenHash) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  getDb()
    .prepare("UPDATE api_tokens SET last_used_at = ? WHERE token_hash = ?")
    .run(nowIso(), tokenHash);
  return { userId: row.user_id };
}

export function listApiTokens(userId: string) {
  return getDb()
    .prepare("SELECT id, label, created_at, expires_at, last_used_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{
    id: string;
    label: string;
    created_at: string;
    expires_at: string;
    last_used_at: string | null;
  }>;
}

export function revokeApiToken(userId: string, id: string) {
  return (
    getDb().prepare("DELETE FROM api_tokens WHERE id = ? AND user_id = ?").run(id, userId)
      .changes > 0
  );
}

/* ------------------------------------------------------------ data export */

export function exportUserData(userId: string) {
  const db = getDb();
  return {
    exportedAt: nowIso(),
    profile: getProfile(userId),
    preferences: getPreferences(userId),
    integrations: listIntegrations(userId).map((integration) => ({
      provider: integration.provider,
      accountLogin: integration.accountLogin,
      status: integration.status,
      scopes: integration.scopes,
      lastSyncedAt: integration.lastSyncedAt,
    })),
    activity: listActivity(userId, { limit: 5000 }),
    evidence: listEvidence(userId, { limit: 5000 }),
    anchors: listAnchors(userId),
    snapshots: db
      .prepare("SELECT * FROM skill_snapshots WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId),
    consent: db
      .prepare("SELECT purpose, scope, version, granted, created_at, revoked_at FROM consent_records WHERE user_id = ?")
      .all(userId),
  };
}

export function deleteUserData(userId: string) {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
}

/* ------------------------------------------------------------- demo seed */

export function seedConsent(userId: string) {
  recordConsent({
    userId,
    purpose: "github_observation",
    scope: "public repository metadata, pull requests, reviews and issues",
    granted: true,
  });
  recordConsent({
    userId,
    purpose: "browser_observation",
    scope: "allowlisted professional documentation domains only",
    granted: false,
  });
}
