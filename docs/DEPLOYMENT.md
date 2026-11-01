# Deployment

Read this first: **the MVP is not production-ready.** It stores data in a local
SQLite file, enforces authorization in application code rather than the database,
and has no email delivery. Treat the notes below as the path to a real
deployment, not as a checklist that makes it safe by itself.

## Runtime requirements

- Node.js ≥ 22
- A persistent filesystem for `data/repuh.db` (and its `-wal`/`-shm` siblings)
- A single writer instance, or a migration to Postgres

SQLite over a network filesystem is unsafe. Serverless platforms with ephemeral
or read-only filesystems (including default Vercel functions) cannot host this
data layer as-is.

## Build and run

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
REPUH_APP_SECRET=... NEXT_PUBLIC_APP_URL=https://your.host pnpm start
```

`next build` produces `.next`; `next start` serves it on port 3000. Put a reverse
proxy in front for TLS, request size limits and timeouts.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `REPUH_APP_SECRET` | **Yes in production** | Session signing, token encryption. Startup throws if left at the dev fallback. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | OAuth redirect, canonical URLs, same-origin assertion. No trailing slash. |
| `REPUH_DATABASE_PATH` | Yes | Absolute path to the SQLite file on a persistent volume. |
| `REPUH_DEMO_MODE` | No | Must be `false` in production. Enables demo seeding. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional | Real GitHub OAuth + sync. |
| `REPUH_CRON_SECRET` | Optional | Bearer token accepted by the scheduled sync route. |
| `HEDERA_NETWORK` | Optional | `testnet` (default), `previewnet` or `mainnet`. |
| `HEDERA_OPERATOR_ID` / `HEDERA_OPERATOR_KEY` / `HEDERA_TOPIC_ID` | Optional | Enable HCS anchoring. All three are required together; the key is never returned by an API. |
| `REPUH_CERT_SIGNING_KEY` | Optional | Base64 PKCS#8 DER Ed25519 key for certificates. Without it, a key is generated and stored in the database. |

Generate the secret:

```bash
openssl rand -base64 48
```

Never commit `.env*`. Rotate `REPUH_APP_SECRET` only with a plan: rotating it
invalidates every session and every encrypted provider token.

## First run

The schema is created idempotently on first database access, and
`instrumentation.ts` seeds labelled demo data **only** when demo mode is on.
In production with demo mode off, the database starts empty.

For Hedera, create and fund an operator, set `HEDERA_OPERATOR_ID` and
`HEDERA_OPERATOR_KEY`, then run `pnpm hedera:setup` to create a topic. Add the
printed `HEDERA_TOPIC_ID` and restart. The setup script refuses to run without
operator credentials and prints the balance as a preflight check.

Keep the certificate key stable. Rotating `REPUH_CERT_SIGNING_KEY` changes the
published key id and makes previously issued certificates verifiable only while
the old public key is retained; there is no key history in this MVP.

## Reverse proxy

- Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Enforce TLS and redirect HTTP.
- Set a request body cap (the API expects small JSON bodies).
- Do not strip `Origin`; the same-origin assertion reads it.
- Health check: `GET /api/leaderboards` returning `200` proves the process and
  database are alive without requiring a session.

## Data

- Back up `repuh.db` with `sqlite3 data/repuh.db ".backup out.db"` (never copy a
  live WAL file directly).
- The file contains password hashes and encrypted provider tokens. Encrypt
  backups at rest and restrict access.
- Account deletion cascades; on-chain roots do not.

## Scaling limits

| Limit | Consequence |
| --- | --- |
| Single SQLite writer | Vertical scaling only |
| In-process rate limiting | Limits are per instance |
| GitHub events API | 90-day window, 300 events per sync |
| In-memory 3D geometry | One instanced node per skill; no per-node lights |

Moving to multi-instance requires: Postgres + RLS, a shared rate-limit store, and
a job runner for sync.

## Migrating to Supabase

1. Create the project and translate `src/lib/db/schema.ts` to SQL migrations
   (`text` → `uuid`, integer booleans → `boolean`, JSON text → `jsonb`).
2. Enable RLS on every table; policies mirror the existing `user_id` predicates.
3. Replace `src/lib/db/index.ts` with a Postgres client; keep
   `src/lib/db/queries.ts` signatures.
4. Move provider-token encryption keys to the platform secret store.
5. Re-run `pnpm typecheck && pnpm test && pnpm build`, then exercise sign-in,
   onboarding, ingestion, fingerprint, public profile and deletion.

## Extension distribution

`pnpm extension:build` emits `apps/extension/dist`, loadable unpacked. Store
publication is out of scope: it needs a listing, a single-purpose statement, a
privacy disclosure and review. The `externally_connectable` origins must be
updated to the production host before pairing from a deployed app.

## Operational checks after deploy

1. `GET /api/leaderboards` → `200`.
2. Register, sign in, complete onboarding.
3. With GitHub configured: connect, sync, confirm events appear and evidence is
   classified.
4. With GitHub absent: the panel says "not configured" and offers no fake state.
5. Anchor a batch; verify an inclusion proof; alter a character and confirm
   failure.
6. Issue a certificate; verify the signature against
   `/api/certificates/key`; confirm the JSON download hashes to the stored value.
7. If Hedera is configured, confirm the batch and certificate carry a topic
   sequence number and resolve on HashScan; read the same message from the
   mirror node.
8. Export data; delete a test account; confirm the public URL 404s.
7. Confirm `Cache-Control: private, no-store` on personalised responses.
