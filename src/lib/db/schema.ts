/**
 * SQLite schema for the MVP.
 *
 * The shapes mirror the Supabase/Postgres model in docs/DATA_MODEL.md. Every
 * table uses text UUID primary keys, explicit status fields and timestamps so a
 * later migration is mechanical rather than a redesign.
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  headline TEXT,
  bio TEXT,
  country TEXT,
  avatar_url TEXT,
  profession TEXT NOT NULL DEFAULT 'software-engineer',
  specialization TEXT,
  public_id TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL DEFAULT 'private',
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_visibility_idx ON profiles(visibility);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  reduced_motion INTEGER NOT NULL DEFAULT 0,
  notifications INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'en',
  leaderboard_opt_in INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  account_login TEXT,
  scopes TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  access_token_encrypted TEXT,
  last_synced_at TEXT,
  last_error TEXT,
  connected_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, reference)
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  project_reference TEXT,
  skill_candidates TEXT NOT NULL DEFAULT '[]',
  attribution_status TEXT NOT NULL DEFAULT 'unverified',
  privacy_status TEXT NOT NULL DEFAULT 'private',
  processing_status TEXT NOT NULL DEFAULT 'pending',
  payload TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, source, external_id)
);
CREATE INDEX IF NOT EXISTS activity_user_time_idx ON activity_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_type_idx ON activity_events(user_id, event_type);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL UNIQUE REFERENCES activity_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  signal TEXT NOT NULL,
  skill_ids TEXT NOT NULL DEFAULT '[]',
  quality REAL NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private',
  verification_state TEXT NOT NULL DEFAULT 'provisional',
  content_hash TEXT NOT NULL,
  reasons TEXT NOT NULL DEFAULT '[]',
  limitations TEXT NOT NULL DEFAULT '[]',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS evidence_user_idx ON evidence(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS evidence_visibility_idx ON evidence(visibility);

CREATE TABLE IF NOT EXISTS skill_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  estimate REAL,
  confidence REAL NOT NULL,
  evidence_count INTEGER NOT NULL,
  project_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  inputs TEXT NOT NULL DEFAULT '{}',
  algorithm_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS snapshots_user_idx ON skill_snapshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS snapshots_skill_idx ON skill_snapshots(skill_id, estimate DESC);

CREATE TABLE IF NOT EXISTS blockchain_anchors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL,
  merkle_root TEXT NOT NULL,
  provider TEXT NOT NULL,
  network TEXT NOT NULL,
  tx_ref TEXT,
  status TEXT NOT NULL DEFAULT 'local',
  leaf_count INTEGER NOT NULL,
  topic_id TEXT,
  sequence_number INTEGER,
  consensus_timestamp TEXT,
  contract_id TEXT,
  contract_batch_id TEXT,
  commitments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  UNIQUE(user_id, batch_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  subject_username TEXT NOT NULL,
  payload TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  key_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  revoked_at TEXT,
  revocation_reason TEXT,
  anchor_network TEXT,
  anchor_topic_id TEXT,
  anchor_sequence INTEGER,
  anchor_tx_ref TEXT,
  anchor_status TEXT NOT NULL DEFAULT 'unavailable',
  evidence_root TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS certificates_user_idx ON certificates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS certificates_skill_idx ON certificates(skill_id, created_at DESC);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  scope TEXT NOT NULL,
  version TEXT NOT NULL,
  granted INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS consent_user_idx ON consent_records(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS leaderboard_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  opted_in INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS api_tokens_user_idx ON api_tokens(user_id);

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
