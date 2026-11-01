import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "@/lib/env";
import { SCHEMA_SQL } from "@/lib/db/schema";
import { randomUUID } from "node:crypto";

export type Db = Database.Database;

declare global {
  var __repuhDb: Db | undefined;
}

function ensureColumn(db: Db, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((entry) => entry.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function createConnection(): Db {
  fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });
  const db = new Database(env.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  // The schema is created with IF NOT EXISTS, so columns added after the first
  // boot need an explicit, idempotent migration for existing files.
  ensureColumn(db, "blockchain_anchors", "topic_id", "TEXT");
  ensureColumn(db, "blockchain_anchors", "sequence_number", "INTEGER");
  ensureColumn(db, "blockchain_anchors", "consensus_timestamp", "TEXT");
  db.prepare(
    "INSERT INTO schema_meta (key, value) VALUES ('schema_version', '1') ON CONFLICT(key) DO UPDATE SET value = COALESCE(schema_meta.value, excluded.value)",
  ).run();
  return db;
}

export function getDb(): Db {
  if (!globalThis.__repuhDb) {
    globalThis.__repuhDb = createConnection();
  }
  return globalThis.__repuhDb;
}

export function newId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export interface AuditInput {
  userId: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
}

export function audit(input: AuditInput) {
  getDb()
    .prepare(
      "INSERT INTO audit_logs (id, user_id, action, target, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      newId("aud"),
      input.userId,
      input.action,
      input.target ?? null,
      JSON.stringify(input.metadata ?? {}),
      nowIso(),
    );
}

export function recordConsent(input: {
  userId: string;
  purpose: string;
  scope: string;
  version?: string;
  granted: boolean;
}) {
  const db = getDb();
  if (!input.granted) {
    db.prepare(
      "UPDATE consent_records SET granted = 0, revoked_at = ? WHERE user_id = ? AND purpose = ? AND granted = 1",
    ).run(nowIso(), input.userId, input.purpose);
  }
  db.prepare(
    "INSERT INTO consent_records (id, user_id, purpose, scope, version, granted, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    newId("cns"),
    input.userId,
    input.purpose,
    input.scope,
    input.version ?? "1.0.0",
    input.granted ? 1 : 0,
    nowIso(),
    input.granted ? null : nowIso(),
  );
}

export function activeConsent(userId: string, purpose: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT granted FROM consent_records WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId, purpose) as { granted: number } | undefined;
  return Boolean(row?.granted);
}
