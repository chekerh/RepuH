# Security

## Identity

- Passwords are hashed with **scrypt** (`N=16384, r=8, p=1`) and a 16-byte
  random salt, stored as `scrypt$N$r$p$salt$hash`. Verification uses
  `timingSafeEqual` on equal-length buffers.
- Sessions are opaque 32-byte random tokens. Only `sha256(token)` is stored, so a
  database read does not yield usable sessions. Sessions carry an absolute
  expiry (30 days) and are deleted on sign-out.
- The session cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in
  production. It is never readable from JavaScript.
- Extension and scheduler access use bearer tokens. Extension tokens are stored
  hashed with a 90-day expiry and a label, and can be revoked individually.

## Authorization

Every mutating handler and every personalised read resolves the actor first and
scopes all data by `user_id`. There is no endpoint that accepts a user id from
the client and trusts it.

Public profiles are a **projection**, not a filter applied late: the public
reader (`getPublicProjection`) selects only `visibility = 'public'` evidence and
only skills with at least one such item. Private and selective items never enter
the query result, so they cannot leak through a serialisation bug.

Leaderboards additionally require `leaderboard_opt_in = 1`; opt-out removes the
person from every board immediately.

## Input validation

Zod schemas in `src/lib/validation/schemas.ts` guard every mutating route.
Unknown keys are stripped. Identifiers are validated against the ontology rather
than accepted as free strings. Payloads are size-capped before parsing.

## Browser security

- `next.config.ts` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options:
  DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`, and HSTS in production.
- State-changing requests must be same-origin: `assertSameOrigin` compares the
  `Origin` header to `NEXT_PUBLIC_APP_URL` and rejects foreign origins with
  `403`. Bearer-token requests are exempt only because they carry no ambient
  credentials.
- No third-party scripts, analytics or fonts are loaded. No CORS is opened.
- User-provided strings are rendered through React's escaping. The only
  `dangerouslySetInnerHTML` in the codebase is the initial theme script, which
  contains a constant.

## Secrets

- `REPUH_APP_SECRET` signs cookies and encrypts provider tokens (AES-256-GCM,
  random IV per value). In production, startup throws if it is still the
  development fallback.
- GitHub access tokens are encrypted at rest and never returned by any API. The
  integration panel reports only login, scopes, status and last sync time.
- `.env*` is git-ignored; `.env.example` contains names only.
- Logs never include tokens, passwords, cookies or raw provider payloads.

## Certificate signing key

Certificate signatures are only as trustworthy as the key. With
`REPUH_CERT_SIGNING_KEY` set, the key lives in the deployment secret store. When
it is absent, the MVP generates an Ed25519 key on first use and stores the
PKCS#8 DER **unencrypted** in `schema_meta`.

That means database read access is sufficient to forge certificates. This is a
real limitation, documented rather than hidden; a production deployment must set
`REPUH_CERT_SIGNING_KEY`, restrict database access, and rotate only with a plan
because there is no key history. The published public key is not secret.

## Rate limiting

An in-process fixed-window limiter (`src/lib/http.ts`) protects sign-in,
registration, recovery requests, reports, extension ingestion and anchoring.
Limits are per key (IP or user id). **In-process is per-instance:** a
multi-instance deployment needs a shared store (Redis/Upstash) and this is
recorded as a production gap rather than implied to work.

## Abuse paths considered

| Path | Control |
| --- | --- |
| Credential stuffing | scrypt cost, per-IP sign-in limit, uniform error text |
| Session theft | hashed storage, HttpOnly, expiry, server-side revocation |
| IDOR on evidence | all queries scoped by `user_id`; ids are UUIDs, not sequential |
| Forged activity | ingest derives attribution; unverified items are downgraded ×0.6 and flagged |
| Extension token leak | scoped to one purpose, hashed at rest, revocable, expiring |
| XSS via provider metadata | React escaping, no HTML rendering of provider strings |
| CSRF | SameSite=Lax plus explicit origin assertion on mutations |
| Enumeration of users | public route returns 404 for private/unknown alike |

## Dependencies

Runtime dependencies are limited to Next.js, React, Three/Fiber/Drei, Zod,
better-sqlite3, clsx, tailwind-merge and lucide-react. No analytics, no auth
SaaS, no ORM, no UI kit. The lockfile is committed.

## Differences from the target architecture

Stated plainly, because the specification targets Supabase with Row Level
Security and this MVP does not:

1. **No RLS.** Authorization is application-level. A query that forgets its
   `user_id` predicate would be a vulnerability; the repository layer centralises
   those predicates and every list query takes `userId` as its first argument.
2. **SQLite.** No network authentication, no per-role grants. File permissions
   are the boundary.
3. **In-process rate limiting.** Per instance only.
4. **No email delivery.** Accounts are marked verified on first successful
   sign-in; there is no address ownership proof yet.
5. **No WAF, no bot protection, no audit pipeline.** `audit_logs` exists and is
   written for security-relevant actions, but nothing ships it anywhere.
6. **Certificate key may live in the database.** See the section above; set
   `REPUH_CERT_SIGNING_KEY` before issuing anything you intend to rely on.
7. **Hedera operator key.** A single operator submits to one topic. There is no
   HSM, no submit-key rotation and no per-user signing key.

## Reporting

This is an evaluation MVP with no production deployment, no bug bounty and no
security contact. Do not deploy it as-is.
