# API

All routes are Next.js route handlers under `src/app/api`. JSON in, JSON out.
Errors share one shape:

```json
{ "error": { "code": "validation_failed", "message": "Some fields need attention.", "details": {} } }
```

Codes: `unauthorized` 401, `forbidden` / `consent_required` / `bad_origin` 403,
`not_found` 404, `validation_failed` / `invalid_json` 422, `rate_limited` 429,
`internal_error` 500.

Authentication is the session cookie (`HttpOnly`) or, for extension and
scheduler routes, `Authorization: Bearer <token>`.

Every personalised response sets `Cache-Control: private, no-store`.

## Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `email`, `password` | Rate limited per IP. Creates user + empty profile. |
| `POST` | `/api/auth/login` | `email`, `password` | Rate limited. Sets session cookie. |
| `POST` | `/api/auth/logout` | — | Revokes the session server-side and clears the cookie. |
| `POST` | `/api/auth/forgot-password` | `email` | Always returns the same response. **No email is sent** — the response says delivery is not configured. |

## Profile and onboarding

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/onboarding` | `displayName`, `username`, `headline`, `bio`, `country`, `specialization`, `visibility`. Completes onboarding. |
| `GET` | `/api/profile` | Own profile, preferences and completeness. |
| `PATCH` | `/api/profile` | Partial update; username uniqueness enforced. |
| `GET` | `/api/profile/public/[username]` | Public projection. 404 for private, unlisted (unless owner) and unknown alike. |

## Activity and evidence

| Method | Path | Query / body |
| --- | --- | --- |
| `GET` | `/api/activity` | `source`, `type`, `days`, `limit` (≤200) → `{ events, summary }` |
| `GET` | `/api/activity/summary` | Counts by source, type and month |
| `GET` | `/api/evidence` | `visibility`, `skill`, `limit` → `{ evidence, counts }` |
| `GET` | `/api/evidence/[id]` | Full item with reasons, limitations, commitment |
| `POST` | `/api/evidence/[id]/report` | `reason` — flags an item for review; writes audit log |

## Fingerprint

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/fingerprint` | `{ fingerprint, snapshotAt, evidenceCount, method }`. Recomputes deterministically. |
| `GET` | `/api/fingerprint/[skillId]` | One skill with contributions, rationale and limitations; 404 for unknown ids |

`fingerprint.skills[]` carries `estimate` (number **or null**), `confidence`,
`status` (`insufficient | provisional | established`), `evidenceCount`,
`projectCount`, `sourceCount`, `coverage`, `contributions[]`, `rationale[]`,
`limitations[]`, `algorithmVersion`.

## Leaderboards

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/leaderboards` | Board index: available skills, participation count |
| `GET` | `/api/leaderboards/[skillId]` | Ranked rows. Only opted-in, public profiles. Ties broken by confidence, then evidence count. |

No composite score and no cross-profession ranking exist.

## Integrations

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/integrations` | Connection state, scopes, last sync, whether credentials are configured |
| `GET` | `/api/integrations/github/connect` | Starts OAuth; 409 when credentials are absent |
| `GET` | `/api/integrations/github/callback` | Exchanges code, encrypts token, first sync |
| `POST` | `/api/integrations/github/sync` | Session or `REPUH_CRON_SECRET` bearer. Idempotent. |
| `POST` | `/api/integrations/github/disconnect` | Deletes the integration; evidence already recorded is retained and marked |
| `POST` | `/api/integrations/github/demo` | **Development only.** 403 unless demo mode. Seeds `is_demo` data. |

## Extension

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/extension/token` | Creates a scoped token; value returned once |
| `GET` | `/api/extension/status` | Token label/expiry, consent state, received counts |
| `POST` | `/api/extension/events` | Batch of `{ externalId, domain, url, title, occurredAt, durationSeconds }`. Requires `browser_observation` consent and an allowlisted domain. Returns `{ accepted, rejected, note }`. |

## Integrity and anchoring

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/blockchain/anchors` | Batches with root, provider, network, status, leaf count, topic/sequence, commitments; plus `providerStatus()` |
| `POST` | `/api/blockchain/anchors` | Batches every not-yet-anchored commitment. Rate limited to 6/hour. `201` with the anchor, or `409` if no receipt was obtained |
| `POST` | `/api/blockchain/verify` | `{ batchId, commitment }` → `{ verified, reason, proof, chain, disclaimer }` |

`providerStatus()` reports `provider` (`hedera-contract`, `hedera-hcs` or
`local`), `network`, `configured`, `contractId`, `contractUrl`, `statement`, and
a `hedera` object with `configured` (consensus), `contractConfigured`,
`network`, `topicId`, `contractId`, `missing[]` (consensus),
`contractMissing[]`, `reason` and `explorerBase`. Missing configuration is
reported as missing — never as a working connection.

Contract batches store `contractId`, `contractBatchId` (decimal uint256), `txRef`
and `consensusTimestamp`; consensus batches store `topicId`, `sequenceNumber`
and `consensusTimestamp`. `confirmed`
is only written after a contract call returns `SUCCESS` and `getRoot` reads the
root back, or after a receipt with a topic sequence number. A failed submit
returns `409` and writes no row.

`chain` in the verification response is the network-level re-read
(`{ checked, matches, via, reason }`, `via` is `contract`, `consensus` or null).
It is separate from the local inclusion proof: a proof can verify while the
network read is unavailable, and the two are reported separately.

## Certificates

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/certificates` | Own certificates (summary) plus Hedera status |
| `POST` | `/api/certificates` | `{ skillId }`. Requires an established estimate; 10/hour; `201` with payload, signature, anchor and public URL |
| `GET` | `/api/certificates/[id]` | Public certificate payload and verification. `?download=1` sets `Content-Disposition` |
| `POST` | `/api/certificates/[id]/revoke` | Revoke an owned certificate. Optional `{ reason }`. Owner only. |
| `GET` | `/api/certificates/status` | Public status list of revoked certificate ids. |
| `GET` | `/api/certificates/key` | Published Ed25519 public key (JWK), key id and algorithm |

The certificate payload is **not** personalized data: it contains the subject's
public display name and username, the claim, the evidence root and the
limitations. It never contains private evidence, email addresses or event
payloads. Anyone with the certificate id can read it; the public page is
`noindex`.

Verification recomputes SHA-256 over the canonical payload, checks the Ed25519
signature, and reports the anchor state separately. An unanchored certificate can
still be valid; a broken signature cannot.

## Privacy and settings

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/privacy/export` | JSON export: profile, preferences, activity, evidence, snapshots, anchors, consents. Sets `Content-Disposition: attachment`. |
| `POST` | `/api/privacy/delete` | Requires the account password. Deletes the user and cascades. |
| `POST` | `/api/privacy/consent` | `{ purpose, granted, scope }` → append-only consent record |
| `GET` | `/api/settings` | Preferences, consents, leaderboard opt-in |
| `PATCH` | `/api/settings` | Partial update of preferences |

## Persona (public, signed)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/profile/public/[username]/persona` | Public, signed persona manifest as Markdown. Returns `text/markdown` with a downloadable `.persona.md` file. Includes capability estimates, public evidence, anchors, active certificates, sources and an Ed25519 signature over the canonical manifest. 404 for private or unknown profiles. |

## Conventions

- Ids are UUID strings; unknown ids return `404`, never `500`.
- Mutations require same-origin (`Origin`/`Referer` host check).
- List endpoints cap `limit` at 200 and default conservatively.
- Timestamps are ISO-8601 UTC.
- No endpoint returns provider tokens, password hashes or session ids.
