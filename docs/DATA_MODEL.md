# Data model

Implemented in `src/lib/db/schema.ts` (SQLite). Shapes mirror the intended
Postgres/Supabase model: text UUID keys, explicit status columns, ISO-8601
timestamps, no database-specific types beyond `INTEGER` booleans.

## Entities

### `users`
Identity anchor. `email` unique, `password_hash` scrypt, `email_verified_at`
nullable (null means unverified — see limitations).

### `sessions`
`id`, `user_id`, `created_at`, `expires_at`, `user_agent`. The cookie value is
never stored; only its SHA-256 under `id`. Cascade delete with the user.

### `profiles`
One per user. Holds `display_name`, unique `username`, `headline`, `bio`,
`country`, `profession` (`software-engineer` is the only ontology today),
`specialization`, random `public_id`, `visibility`
(`private | unlisted | public`), `onboarding_complete`, `is_demo`.

`username` is the public route key; `public_id` exists so an internal identifier
is never the public one.

### `user_preferences`
`theme`, `reduced_motion`, `notifications`, `language`,
`leaderboard_opt_in`.

### `integrations`
One row per `(user, provider)`. `account_login`, `scopes` (JSON array), `status`
(`pending | connected | error | disconnected`), `access_token_encrypted`
(AES-256-GCM), `last_synced_at`, `last_error`, `connected_at`.

### `projects`
`(user_id, reference)` unique. `source` records where the project reference came
from. Used for corroboration counts, not for public display of private repos.

### `activity_events`
The append-only normalised record. `(user_id, source, external_id)` is unique —
this is the idempotency key for sync and extension ingestion.

| Column | Notes |
| --- | --- |
| `event_type` | one of the ten normalised types |
| `occurred_at` | provider time, not receipt time |
| `payload` | JSON, metadata only |
| `skill_candidates` | JSON array from classification |
| `attribution_status` | `self | coauthored | unverified` |
| `privacy_status` | default `private` |
| `processing_status` | `pending | processed | skipped | failed` |
| `is_demo` | true for the labelled development dataset |

### `evidence`
One per activity event (`event_id` unique). Carries the claim: `signal`, mapped
`skill_ids`, `quality`, `visibility`, `verification_state`
(`provisional | corroborated | disputed | retracted`), `content_hash`, `reasons`
(JSON: rule + skill), `limitations` (JSON).

`content_hash` is the commitment input; it is a digest of the classified record
without personal identifiers.

### `skill_snapshots`
Append-only scoring history: `skill_id`, `estimate` (nullable), `confidence`,
`evidence_count`, `project_count`, `status`, `inputs` JSON,
`algorithm_version`, `created_at`. The fingerprint reads the newest snapshot per
skill; history enables provenance and lets a version bump be visible.

### `blockchain_anchors`
`batch_id` unique per user, `merkle_root`, `provider`
(`hedera-contract | hedera-hcs | local`), `network`, `tx_ref`,
`status` (`local | submitted | confirmed | failed`), `leaf_count`,
`contract_id`, `contract_batch_id`, `topic_id`, `sequence_number`,
`consensus_timestamp`, `commitments` JSON array. Contract batches populate
`contract_id`, `contract_batch_id` (the decimal uint256 the root is stored under)
and `tx_ref`; consensus batches populate `topic_id` and `sequence_number`; all
are null for local batches. Values are only written after the network receipt (and, for the
contract, a read-back of the stored root). Commitments are stored so inclusion
proofs can be regenerated without rescanning evidence.

### `certificates`
A signed capability record. `skill_id`, `subject_username`, `payload` (canonical
JSON string), `payload_hash`, `signature` (base64 Ed25519), `key_id`,
`status` (`active | revoked`), `anchor_network`, `anchor_topic_id`,
`anchor_sequence`, `anchor_tx_ref`, `anchor_status`
(`unavailable | local | submitted | confirmed | failed`), `evidence_root`,
`created_at`, `registry_contract_id`, `registry_network`, `registry_tx_ref`,
`registry_revocation_tx_ref` (all nullable receipt metadata). Existing databases
receive these columns through idempotent migrations.

The anchor is stored beside the payload rather than inside it, so losing a
receipt cannot invalidate the signature. Cascade delete with the user; a Hedera
message or contract record already committed to the network is not recalled.
`POST /api/certificates/[id]/revoke` revokes locally and attempts contract revocation
when a confirmed registry receipt exists. A failed contract call remains retryable.

### `consent_records`
Append-only: `purpose` (`browser_observation | github_metadata | public_profile
| leaderboard`), `scope`, `version`, `granted`, `created_at`, `revoked_at`.
Current consent is the latest row per purpose; revocation writes a new row rather
than mutating history.

### `leaderboard_preferences`
`opted_in`, separate from the general preference for clarity of intent.

### `audit_logs`
`action`, `target`, `metadata`, `created_at`. Written for sign-in, sign-out,
integration connect/disconnect, export, deletion, anchoring and visibility
changes.

### `api_tokens`
Extension/scheduler tokens: `token_hash` unique, `label`, `expires_at`,
`last_used_at`, cascading delete.

## Retention and deletion

- Account deletion removes the user row; every table cascades. `audit_logs`
  uses `ON DELETE SET NULL` so the security record survives without the identity.
- Anchored roots remain on-chain by construction and cannot be removed. The
  deletion dialog says this before confirming, and the export includes the
  anchor list so a person can see what is irreversible.
- Demo data is identified by `is_demo = 1` on `profiles`, `activity_events` and
  `evidence`, and never mixes into a real account.

## Indexes

Chosen for the read patterns actually used:

- `activity_events(user_id, occurred_at DESC)` — timeline
- `activity_events(user_id, event_type)` — filters
- `evidence(user_id, created_at DESC)` — evidence list
- `evidence(visibility)` — public projection
- `skill_snapshots(user_id, created_at DESC)`, `(skill_id, estimate DESC)` —
  fingerprint and leaderboards
- `sessions(expires_at)` — expiry sweeps

## Migration path to Postgres

1. Translate `SCHEMA_SQL` to SQL migrations; `TEXT` → `uuid`, `INTEGER` booleans
   → `boolean`, JSON text → `jsonb`.
2. Replace `src/lib/db/index.ts` with a Postgres pool; keep
   `src/lib/db/queries.ts` signatures identical.
3. Add RLS policies mirroring the existing `user_id` predicates, then test that
   a foreign user id returns zero rows at the database level.
4. Add a unique partial index for active sessions and move rate limiting to a
   shared store.
