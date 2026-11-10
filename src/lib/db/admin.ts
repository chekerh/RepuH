/**
 * Read-only queries for the developer admin surface.
 *
 * Everything here is observation: counts, sizes, timestamps and integrity
 * checks. No admin page can delete, re-seed or rewrite user data, so opening
 * the dashboard cannot change an account or an anchor.
 */

import fs from "node:fs";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";

type Param = string | number | null;

function scalar(sql: string, ...params: Param[]): number {
  const row = getDb()
    .prepare(sql)
    .get(...params) as { c: number } | undefined;
  return row?.c ?? 0;
}

export interface AdminOverview {
  users: {
    total: number;
    onboarded: number;
    demo: number;
    verified: number;
    publicProfiles: number;
    selectableProfiles: number;
  };
  growth: { signups7: number; signups30: number; evidence7: number; evidence30: number };
  content: {
    evidence: number;
    demoEvidence: number;
    events: number;
    certificates: number;
    revokedCertificates: number;
    anchors: number;
    confirmedAnchors: number;
  };
  integrations: { connected: number; demo: number; error: number };
  sessions: { active: number };
}

export function adminOverview(): AdminOverview {
  const now = new Date().toISOString();
  return {
    users: {
      total: scalar("SELECT COUNT(*) AS c FROM users"),
      onboarded: scalar("SELECT COUNT(*) AS c FROM profiles WHERE onboarding_complete = 1"),
      demo: scalar("SELECT COUNT(*) AS c FROM profiles WHERE is_demo = 1"),
      verified: scalar("SELECT COUNT(*) AS c FROM users WHERE email_verified_at IS NOT NULL"),
      publicProfiles: scalar(
        "SELECT COUNT(*) AS c FROM profiles WHERE visibility = 'public' AND onboarding_complete = 1",
      ),
      selectableProfiles: scalar(
        "SELECT COUNT(*) AS c FROM profiles WHERE visibility = 'selective' AND onboarding_complete = 1",
      ),
    },
    growth: {
      signups7: scalar("SELECT COUNT(*) AS c FROM users WHERE created_at >= datetime('now', '-7 days')"),
      signups30: scalar("SELECT COUNT(*) AS c FROM users WHERE created_at >= datetime('now', '-30 days')"),
      evidence7: scalar(
        "SELECT COUNT(*) AS c FROM evidence WHERE created_at >= datetime('now', '-7 days')",
      ),
      evidence30: scalar(
        "SELECT COUNT(*) AS c FROM evidence WHERE created_at >= datetime('now', '-30 days')",
      ),
    },
    content: {
      evidence: scalar("SELECT COUNT(*) AS c FROM evidence"),
      demoEvidence: scalar("SELECT COUNT(*) AS c FROM evidence WHERE is_demo = 1"),
      events: scalar("SELECT COUNT(*) AS c FROM activity_events"),
      certificates: scalar("SELECT COUNT(*) AS c FROM certificates"),
      // Revocation keeps the row: a revoked certificate is still a signed record,
      // so it stays in the total and is counted separately rather than hidden.
      revokedCertificates: scalar(
        "SELECT COUNT(*) AS c FROM certificates WHERE status = 'revoked'",
      ),
      anchors: scalar("SELECT COUNT(*) AS c FROM blockchain_anchors"),
      confirmedAnchors: scalar(
        "SELECT COUNT(*) AS c FROM blockchain_anchors WHERE status = 'confirmed'",
      ),
    },
    integrations: {
      connected: scalar("SELECT COUNT(*) AS c FROM integrations WHERE status = 'connected'"),
      demo: scalar("SELECT COUNT(*) AS c FROM integrations WHERE status = 'demo'"),
      error: scalar("SELECT COUNT(*) AS c FROM integrations WHERE status = 'error'"),
    },
    sessions: {
      active: scalar("SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?", now),
    },
  };
}

export type AdminUserFilter = "all" | "real" | "demo" | "public" | "unverified" | "incomplete";

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  visibility: string | null;
  onboardingComplete: boolean;
  isDemo: boolean;
  verified: boolean;
  evidenceCount: number;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface AdminUserPage {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pages: number;
}

const USER_FILTERS: Record<AdminUserFilter, string> = {
  all: "1 = 1",
  real: "COALESCE(p.is_demo, 0) = 0",
  demo: "p.is_demo = 1",
  public: "p.visibility = 'public'",
  unverified: "u.email_verified_at IS NULL",
  incomplete: "COALESCE(p.onboarding_complete, 0) = 0",
};

/** User ids are never accepted from the page: only the allowlisted filter key. */
export function adminUsers(input: {
  query?: string;
  filter?: string;
  page?: number;
  pageSize?: number;
}): AdminUserPage {
  const filter: AdminUserFilter =
    input.filter && Object.hasOwn(USER_FILTERS, input.filter)
      ? (input.filter as AdminUserFilter)
      : "all";
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 5), 100);
  const page = Math.max(input.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const q = (input.query ?? "").trim().slice(0, 120);

  const where = [USER_FILTERS[filter]];
  const params: Param[] = [];
  if (q) {
    where.push("(u.email LIKE ? OR p.username LIKE ? OR p.display_name LIKE ?)");
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern);
  }
  const whereSql = where.join(" AND ");

  const total = scalar(
    `SELECT COUNT(*) AS c FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE ${whereSql}`,
    ...params,
  );

  const rows = getDb()
    .prepare(
      `SELECT u.id, u.email, u.created_at, u.email_verified_at,
              p.display_name, p.username, p.visibility,
              p.onboarding_complete, p.is_demo,
              (SELECT COUNT(*) FROM evidence e WHERE e.user_id = u.id) AS evidence_count,
              (SELECT MAX(a.occurred_at) FROM activity_events a WHERE a.user_id = u.id) AS last_activity_at
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
        WHERE ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as Array<{
    id: string;
    email: string;
    created_at: string;
    email_verified_at: string | null;
    display_name: string | null;
    username: string | null;
    visibility: string | null;
    onboarding_complete: number | null;
    is_demo: number | null;
    evidence_count: number;
    last_activity_at: string | null;
  }>;

  return {
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      username: row.username,
      visibility: row.visibility,
      onboardingComplete: Boolean(row.onboarding_complete),
      isDemo: Boolean(row.is_demo),
      verified: Boolean(row.email_verified_at),
      evidenceCount: row.evidence_count,
      lastActivityAt: row.last_activity_at,
      createdAt: row.created_at,
    })),
    total,
    page,
    pages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export interface AdminAuditRow {
  id: string;
  action: string;
  target: string | null;
  actor: string | null;
  createdAt: string;
}

export function adminAuditLog(limit = 40): AdminAuditRow[] {
  const rows = getDb()
    .prepare(
      `SELECT l.id, l.action, l.target, l.created_at, u.email AS actor
         FROM audit_logs l
         LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC
        LIMIT ?`,
    )
    .all(Math.min(Math.max(limit, 1), 200)) as Array<{
    id: string;
    action: string;
    target: string | null;
    created_at: string;
    actor: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    target: row.target,
    actor: row.actor,
    createdAt: row.created_at,
  }));
}

const TABLES = [
  "users",
  "profiles",
  "sessions",
  "integrations",
  "projects",
  "activity_events",
  "evidence",
  "skill_snapshots",
  "blockchain_anchors",
  "certificates",
  "consent_records",
  "leaderboard_preferences",
  "audit_logs",
  "api_tokens",
  "schema_meta",
] as const;

export interface AdminTableCount {
  table: string;
  rows: number;
}

export function adminTableCounts(): AdminTableCount[] {
  return TABLES.map((table) => ({
    table,
    rows: scalar(`SELECT COUNT(*) AS c FROM "${table}"`),
  }));
}

function fileBytes(file: string): number | null {
  try {
    return fs.statSync(file).size;
  } catch {
    return null;
  }
}

export interface AdminDatabaseFacts {
  path: string;
  databaseBytes: number | null;
  walBytes: number | null;
  shmBytes: number | null;
  journalMode: string;
  pageSize: number;
  pageCount: number;
  freelistCount: number;
  schemaVersion: string;
  foreignKeys: boolean;
  quickCheck: string;
}

export function adminDatabaseFacts(): AdminDatabaseFacts {
  const db = getDb();
  const pragma = (name: string) => db.pragma(name, { simple: true });
  const schema = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'")
    .get() as { value: string } | undefined;
  const quick = db.prepare("PRAGMA quick_check").get() as Record<string, unknown> | undefined;

  return {
    path: env.databasePath,
    databaseBytes: fileBytes(env.databasePath),
    walBytes: fileBytes(`${env.databasePath}-wal`),
    shmBytes: fileBytes(`${env.databasePath}-shm`),
    journalMode: String(pragma("journal_mode")),
    pageSize: Number(pragma("page_size")),
    pageCount: Number(pragma("page_count")),
    freelistCount: Number(pragma("freelist_count")),
    schemaVersion: schema?.value ?? "unknown",
    foreignKeys: Number(pragma("foreign_keys")) === 1,
    quickCheck: String(Object.values(quick ?? {})[0] ?? "unknown"),
  };
}

/** A single round-trip, reported as milliseconds. Not a benchmark. */
export function adminDatabaseLatency(): number {
  const start = performance.now();
  getDb().prepare("SELECT 1").get();
  return Math.max(performance.now() - start, 0);
}

export interface AdminSecurityFacts {
  unverifiedUsers: number;
  activeSessions: number;
  expiredSessions: number;
  auditEvents24h: number;
  certificateKeySource: "environment" | "generated (database)" | "not created yet";
  apiTokens: number;
}

export function adminSecurityFacts(): AdminSecurityFacts {
  const now = new Date().toISOString();
  const hasGeneratedKey = Boolean(
    getDb()
      .prepare("SELECT 1 FROM schema_meta WHERE key = 'certificate_signing_key_pkcs8'")
      .get(),
  );
  return {
    unverifiedUsers: scalar("SELECT COUNT(*) AS c FROM users WHERE email_verified_at IS NULL"),
    activeSessions: scalar("SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?", now),
    expiredSessions: scalar("SELECT COUNT(*) AS c FROM sessions WHERE expires_at <= ?", now),
    auditEvents24h: scalar(
      "SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= datetime('now', '-1 day')",
    ),
    certificateKeySource: env.certificateSigningKey
      ? "environment"
      : hasGeneratedKey
        ? "generated (database)"
        : "not created yet",
    apiTokens: scalar("SELECT COUNT(*) AS c FROM api_tokens"),
  };
}

export interface AdminSeoFacts {
  publicProfiles: number;
  demoPublicProfiles: number;
  privateProfiles: number;
  certificates: number;
}

export function adminSeoFacts(): AdminSeoFacts {
  return {
    publicProfiles: scalar(
      "SELECT COUNT(*) AS c FROM profiles WHERE visibility = 'public' AND onboarding_complete = 1 AND is_demo = 0",
    ),
    demoPublicProfiles: scalar(
      "SELECT COUNT(*) AS c FROM profiles WHERE visibility = 'public' AND onboarding_complete = 1 AND is_demo = 1",
    ),
    privateProfiles: scalar(
      "SELECT COUNT(*) AS c FROM profiles WHERE visibility = 'private' AND onboarding_complete = 1",
    ),
    certificates: scalar("SELECT COUNT(*) AS c FROM certificates"),
  };
}

/** Read-only shaping helpers for the console charts. */
export interface AdminDayPoint {
  date: string;
  accounts: number;
  evidence: number;
  events: number;
}

/** ISO timestamps are stored with a `T`, so string comparison against an ISO
 *  bound is valid and avoids SQLite date parsing differences.
 *  activity_events records when a signal happened (`occurred_at`) instead of a
 *  row insert time, so the window predicate has to follow the table. */
function windowCount(table: "users" | "evidence" | "activity_events", from: string, to: string) {
  const column = table === "activity_events" ? "occurred_at" : "created_at";
  return scalar(`SELECT COUNT(*) AS c FROM ${table} WHERE ${column} >= ? AND ${column} < ?`, from, to);
}

export interface AdminDelta {
  current: number;
  previous: number;
}

export function adminDeltas(): { accounts: AdminDelta; evidence: AdminDelta; events: AdminDelta } {
  const day = 86_400_000;
  const now = Date.now();
  const iso = (value: number) => new Date(value).toISOString();
  const week = { from: iso(now - 7 * day), to: iso(now + day) };
  const prior = { from: iso(now - 14 * day), to: iso(now - 7 * day) };
  return {
    accounts: {
      current: windowCount("users", week.from, week.to),
      previous: windowCount("users", prior.from, prior.to),
    },
    evidence: {
      current: windowCount("evidence", week.from, week.to),
      previous: windowCount("evidence", prior.from, prior.to),
    },
    events: {
      current: windowCount("activity_events", week.from, week.to),
      previous: windowCount("activity_events", prior.from, prior.to),
    },
  };
}

export function adminDailySeries(days = 14): AdminDayPoint[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const since = start.toISOString();

  const collect = (sql: string) => {
    const map = new Map<string, number>();
    for (const row of getDb().prepare(sql).all(since) as Array<{ d: string; c: number }>) {
      map.set(row.d, row.c);
    }
    return map;
  };

  const accounts = collect(
    "SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c FROM users WHERE created_at >= ? GROUP BY d",
  );
  const evidence = collect(
    "SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c FROM evidence WHERE created_at >= ? GROUP BY d",
  );
  const events = collect(
    "SELECT substr(occurred_at, 1, 10) AS d, COUNT(*) AS c FROM activity_events WHERE occurred_at >= ? GROUP BY d",
  );

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      accounts: accounts.get(key) ?? 0,
      evidence: evidence.get(key) ?? 0,
      events: events.get(key) ?? 0,
    };
  });
}

function labelledCounts(sql: string, limit = 8): Array<{ label: string; value: number }> {
  return getDb()
    .prepare(sql)
    .all(limit) as Array<{ label: string; value: number }>;
}

function pretty(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export interface AdminEvidenceBreakdown {
  signals: Array<{ label: string; value: number }>;
  verification: Array<{ label: string; value: number }>;
  visibility: Array<{ label: string; value: number }>;
  skills: Array<{ label: string; value: number }>;
  demo: number;
  total: number;
}

export function adminEvidenceBreakdown(): AdminEvidenceBreakdown {
  const skills = new Map<string, number>();
  const rows = getDb().prepare("SELECT skill_ids FROM evidence").all() as Array<{ skill_ids: string }>;
  for (const row of rows) {
    try {
      const parsed: unknown = JSON.parse(row.skill_ids);
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (typeof id === "string" && id.length > 0) {
            skills.set(id, (skills.get(id) ?? 0) + 1);
          }
        }
      }
    } catch {
      // A malformed payload is a data-quality fact, not a reason to fail the page.
    }
  }

  return {
    signals: labelledCounts(
      "SELECT signal AS label, COUNT(*) AS value FROM evidence GROUP BY signal ORDER BY value DESC, label LIMIT ?",
    ).map((row) => ({ label: pretty(row.label), value: row.value })),
    verification: labelledCounts(
      "SELECT verification_state AS label, COUNT(*) AS value FROM evidence GROUP BY verification_state ORDER BY value DESC, label LIMIT ?",
    ).map((row) => ({ label: pretty(row.label), value: row.value })),
    visibility: labelledCounts(
      "SELECT visibility AS label, COUNT(*) AS value FROM evidence GROUP BY visibility ORDER BY value DESC, label LIMIT ?",
    ).map((row) => ({ label: pretty(row.label), value: row.value })),
    skills: [...skills.entries()]
      .map(([label, value]) => ({ label: pretty(label), value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, 8),
    demo: scalar("SELECT COUNT(*) AS c FROM evidence WHERE is_demo = 1"),
    total: scalar("SELECT COUNT(*) AS c FROM evidence"),
  };
}

export interface AdminProfileBreakdown {
  visibility: Array<{ label: string; value: number }>;
  professions: Array<{ label: string; value: number }>;
  countries: Array<{ label: string; value: number }>;
}

export function adminProfileBreakdown(): AdminProfileBreakdown {
  return {
    visibility: labelledCounts(
      "SELECT visibility AS label, COUNT(*) AS value FROM profiles WHERE onboarding_complete = 1 GROUP BY visibility ORDER BY value DESC LIMIT ?",
    ),
    professions: labelledCounts(
      "SELECT profession AS label, COUNT(*) AS value FROM profiles WHERE onboarding_complete = 1 GROUP BY profession ORDER BY value DESC, label LIMIT ?",
    ).map((row) => ({ label: pretty(row.label), value: row.value })),
    countries: labelledCounts(
      "SELECT COALESCE(country, 'Not stated') AS label, COUNT(*) AS value FROM profiles WHERE onboarding_complete = 1 GROUP BY label ORDER BY value DESC, label LIMIT ?",
    ),
  };
}

export interface AdminTopProfile {
  username: string;
  displayName: string;
  evidenceCount: number;
  isDemo: boolean;
  visibility: string;
}

export function adminTopProfiles(limit = 6): AdminTopProfile[] {
  return (
    getDb()
      .prepare(
        `SELECT p.username, p.display_name, p.is_demo, p.visibility,
                (SELECT COUNT(*) FROM evidence e WHERE e.user_id = p.user_id) AS evidence_count
           FROM profiles p
          WHERE p.onboarding_complete = 1
          ORDER BY evidence_count DESC, p.display_name
          LIMIT ?`,
      )
      .all(limit) as Array<{
      username: string;
      display_name: string;
      is_demo: number;
      visibility: string;
      evidence_count: number;
    }>
  ).map((row) => ({
    username: row.username,
    displayName: row.display_name,
    evidenceCount: row.evidence_count,
    isDemo: Boolean(row.is_demo),
    visibility: row.visibility,
  }));
}

export interface AdminActivityRow {
  id: string;
  source: string;
  eventType: string;
  occurredAt: string;
  actor: string | null;
  processingStatus: string;
  isDemo: boolean;
}

export function adminRecentEvents(limit = 12): AdminActivityRow[] {
  return (
    getDb()
      .prepare(
        `SELECT a.id, a.source, a.event_type, a.occurred_at, a.processing_status, a.is_demo,
                u.email AS actor
           FROM activity_events a
           LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.occurred_at DESC
          LIMIT ?`,
      )
      .all(Math.min(Math.max(limit, 1), 100)) as Array<{
      id: string;
      source: string;
      event_type: string;
      occurred_at: string;
      processing_status: string;
      is_demo: number;
      actor: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    source: row.source,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    actor: row.actor,
    processingStatus: row.processing_status,
    isDemo: Boolean(row.is_demo),
  }));
}

export function adminHeatmap(days = 14): Array<{ date: string; buckets: number[] }> {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const since = start.toISOString();

  const rows = getDb()
    .prepare(
      `SELECT substr(occurred_at, 1, 10) AS d,
              CAST(substr(occurred_at, 12, 2) AS INTEGER) AS h,
              COUNT(*) AS c
         FROM activity_events
        WHERE occurred_at >= ?
        GROUP BY d, h`,
    )
    .all(since) as Array<{ d: string; h: number; c: number }>;

  const index = new Map<string, number[]>();
  for (const row of rows) {
    const buckets = index.get(row.d) ?? Array.from({ length: 12 }, () => 0);
    const bucket = Math.min(Math.max(Math.floor(row.h / 2), 0), 11);
    buckets[bucket] = (buckets[bucket] ?? 0) + row.c;
    index.set(row.d, buckets);
  }

  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    return { date: key, buckets: index.get(key) ?? Array.from({ length: 12 }, () => 0) };
  });
}

export interface AdminCertificateFacts {
  status: Array<{ label: string; value: number }>;
  anchorStatus: Array<{ label: string; value: number }>;
  total: number;
}

export function adminCertificateFacts(): AdminCertificateFacts {
  return {
    status: labelledCounts(
      "SELECT status AS label, COUNT(*) AS value FROM certificates GROUP BY status ORDER BY value DESC LIMIT ?",
    ),
    anchorStatus: labelledCounts(
      "SELECT anchor_status AS label, COUNT(*) AS value FROM certificates GROUP BY anchor_status ORDER BY value DESC LIMIT ?",
    ),
    total: scalar("SELECT COUNT(*) AS c FROM certificates"),
  };
}

export interface AdminCertificateRow {
  id: string;
  skillId: string;
  subject: string;
  status: string;
  anchorStatus: string;
  sequence: number | null;
  createdAt: string;
  revokedAt: string | null;
}

export function adminCertificates(limit = 20): AdminCertificateRow[] {
  return (
    getDb()
      .prepare(
        `SELECT id, skill_id, subject_username, status, anchor_status, anchor_sequence, created_at, revoked_at
           FROM certificates
          ORDER BY created_at DESC
          LIMIT ?`,
      )
      .all(Math.min(Math.max(limit, 1), 100)) as Array<{
      id: string;
      skill_id: string;
      subject_username: string;
      status: string;
      anchor_status: string;
      anchor_sequence: number | null;
      created_at: string;
      revoked_at: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    skillId: row.skill_id,
    subject: row.subject_username,
    status: row.status,
    anchorStatus: row.anchor_status,
    sequence: row.anchor_sequence,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

export interface AdminIntegrationRow {
  provider: string;
  status: string;
  count: number;
  lastError: string | null;
  lastSyncedAt: string | null;
}

/** Provider names and statuses only. Access tokens are never selected. */
export function adminIntegrations(): AdminIntegrationRow[] {
  return (
    getDb()
      .prepare(
        `SELECT provider, status, COUNT(*) AS count,
                MAX(last_error) AS last_error, MAX(last_synced_at) AS last_synced_at
           FROM integrations
          GROUP BY provider, status
          ORDER BY provider, status`,
      )
      .all() as Array<{
      provider: string;
      status: string;
      count: number;
      last_error: string | null;
      last_synced_at: string | null;
    }>
  ).map((row) => ({
    provider: row.provider,
    status: row.status,
    count: row.count,
    lastError: row.last_error,
    lastSyncedAt: row.last_synced_at,
  }));
}

export interface AdminRecentEvidence {
  id: string;
  title: string;
  signal: string;
  verificationState: string;
  visibility: string;
  createdAt: string;
  owner: string | null;
  isDemo: boolean;
}

export function adminRecentEvidence(limit = 10): AdminRecentEvidence[] {
  return (
    getDb()
      .prepare(
        `SELECT e.id, e.title, e.signal, e.verification_state, e.visibility, e.created_at, e.is_demo,
                p.username AS owner
           FROM evidence e
           LEFT JOIN profiles p ON p.user_id = e.user_id
          ORDER BY e.created_at DESC
          LIMIT ?`,
      )
      .all(Math.min(Math.max(limit, 1), 100)) as Array<{
      id: string;
      title: string;
      signal: string;
      verification_state: string;
      visibility: string;
      created_at: string;
      is_demo: number;
      owner: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    title: row.title,
    signal: row.signal,
    verificationState: row.verification_state,
    visibility: row.visibility,
    createdAt: row.created_at,
    owner: row.owner,
    isDemo: Boolean(row.is_demo),
  }));
}

export interface AdminFunnelStep {
  label: string;
  value: number;
  hint?: string;
}

export function adminFunnel(): AdminFunnelStep[] {
  const withEvidence = scalar(
    "SELECT COUNT(*) AS c FROM profiles p WHERE p.onboarding_complete = 1 AND EXISTS (SELECT 1 FROM evidence e WHERE e.user_id = p.user_id)",
  );
  return [
    { label: "Accounts", value: scalar("SELECT COUNT(*) AS c FROM users") },
    {
      label: "Onboarded profiles",
      value: scalar("SELECT COUNT(*) AS c FROM profiles WHERE onboarding_complete = 1"),
    },
    { label: "Profiles with evidence", value: withEvidence },
    {
      label: "Public profiles",
      value: scalar(
        "SELECT COUNT(*) AS c FROM profiles WHERE visibility = 'public' AND onboarding_complete = 1 AND is_demo = 0",
      ),
    },
  ];
}

export interface AdminFinopsFacts {
  databaseBytes: number | null;
  walBytes: number | null;
  evidence: number;
  events: number;
  certificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  anchors: number;
  confirmedAnchors: number;
  activeSessions: number;
  apiTokens: number;
}

export function adminFinopsFacts(): AdminFinopsFacts {
  return {
    databaseBytes: fileBytes(env.databasePath),
    walBytes: fileBytes(`${env.databasePath}-wal`),
    evidence: scalar("SELECT COUNT(*) AS c FROM evidence"),
    events: scalar("SELECT COUNT(*) AS c FROM activity_events"),
    certificates: scalar("SELECT COUNT(*) AS c FROM certificates"),
    activeCertificates: scalar("SELECT COUNT(*) AS c FROM certificates WHERE status = 'active'"),
    revokedCertificates: scalar("SELECT COUNT(*) AS c FROM certificates WHERE status = 'revoked'"),
    anchors: scalar("SELECT COUNT(*) AS c FROM blockchain_anchors"),
    confirmedAnchors: scalar(
      "SELECT COUNT(*) AS c FROM blockchain_anchors WHERE status = 'confirmed'",
    ),
    activeSessions: scalar(
      "SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?",
      new Date().toISOString(),
    ),
    apiTokens: scalar("SELECT COUNT(*) AS c FROM api_tokens"),
  };
}
