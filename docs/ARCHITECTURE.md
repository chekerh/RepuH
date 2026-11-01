# Architecture

## Shape

A **modular monolith**: one deployable Next.js application whose internal
boundaries are explicit modules with narrow interfaces. The specification's MVP
scope (33 pages, 10 phases) does not justify a distributed system, and splitting
these modules across services would add operational risk without changing what
the product can prove.

```
src/
  app/                    Presentation: routes, layouts, API handlers
  components/             Design system, 3D lattice, feature surfaces
  lib/
    ontology/             Skill + signal definitions (data only)
    evidence/             Normalisation → classification rules
    scoring/              Deterministic estimate + confidence engine
    integrity/            Canonicalisation, commitments, Merkle tree/proofs
    blockchain/           Anchor provider interface, local + Hedera adapters
    hedera/               HCS envelopes, client, mirror-node read, config
    certificates/         Signed capability records, keys, issuance, verification
    github/               OAuth client + activity sync
    db/                   Schema, connection, repository queries
    auth/                 Password hashing, sessions, guards
    services/             Ingest pipeline (normalise → evidence → snapshot)
    validation/           Zod schemas for every mutating boundary
    http.ts               Typed responses, same-origin + rate limiting
    demo/                 Labelled development dataset generator
apps/extension/           Manifest V3 companion (separate build)
contracts/                Solidity reference anchor contract
tests/                    Unit tests for the deterministic core
data/                     SQLite file (git-ignored)
```

## Dependency direction

```
app/  →  components/  →  lib/services  →  lib/{evidence,scoring,integrity}
                                    ↘  lib/db  →  SQLite
```

Rules enforced by review, not by tooling:

- `lib/ontology`, `lib/scoring`, `lib/evidence` and `lib/integrity` are **pure**:
  no database, no network, no `process.env`, no clock reads except the injected
  `now`.
- Route handlers validate input, resolve the actor, call a service or query, and
  return a typed response. They do not compute scores.
- Only `lib/db` talks to SQLite. Pages and components never embed SQL.

## Request lifecycle (authenticated read)

1. `src/lib/auth/request.ts` resolves the actor from the session cookie, an
   extension bearer token, or a signed-in Next.js session; returns `null` when
   anonymous.
2. The route validates parameters with Zod.
3. A query or service returns a domain object (`src/lib/domain/types.ts`).
4. The page renders server-side. Personalised responses send `Cache-Control:
   private, no-store`.

## Request lifecycle (activity → evidence → score)

```
GitHub API / extension event
        │
        ▼
normalise            validate shape, map to NormalizedEventType, derive
        │            attribution, drop unverifiable records
        ▼
classify             deterministic rules over metadata → signal, skills,
        │            quality, reasons[], limitations[]
        ▼
persist              activity_events row + evidence row (unique per event)
        │
        ▼
recompute            scoreSkill() for affected skills → skill_snapshots row
        │
        ▼
project              public profile reads only visibility='public' rows
```

The ingest service (`src/lib/services/ingest.ts`) is the only place that writes
both an activity event and its evidence. Idempotency comes from
`UNIQUE(user_id, source, external_id)` on `activity_events`.

## Hedera and certificates

`src/lib/hedera` owns the only network integration that produces an external
receipt. It is split so the byte format stays testable without the SDK:

- `envelopes.ts` — pure envelope builders and the 1024-byte limit.
- `hcs.ts` — SDK client, topic submit, receipt handling, mirror read.
- `config.ts` — configuration state; a partial configuration is reported as not
  configured, with missing variable names.

`src/lib/blockchain` resolves the provider and never records `confirmed` without
a topic sequence number. `src/lib/certificates` builds a canonical claim, signs
it with Ed25519, and anchors its hash separately. Certificate verification
recomputes the hash and signature rather than trusting the stored status.

## Why SQLite here, Supabase in production

The specification targets Supabase/Postgres with Row Level Security. That is the
right production target, but it requires a hosted project and credentials this
environment does not have, and a fork that only compiles with someone's keys is
not a working MVP.

The MVP therefore uses SQLite through a repository layer whose method signatures
match the intended Postgres operations. The schema in `src/lib/db/schema.ts`
mirrors the documented Postgres model one-to-one: same UUID keys, same status
enums, same timestamps. Moving to Supabase means replacing `src/lib/db/index.ts`
and translating the query bodies — not rewriting the product.

**This means authorization is enforced in application queries, not by RLS.** That
is a real reduction in defence-in-depth and is recorded in
[docs/SECURITY.md](SECURITY.md#differences-from-the-target-architecture).

## Rendering and the 3D lattice

Pages are server components. Interactive surfaces are client islands:

- `components/lattice.tsx` — React Three Fiber capability lattice. It renders
  instanced geometry, renders one node per ontology skill, honours `prefers-reduced-motion`,
  pauses when off-screen, and falls back to a 2D SVG projection when WebGL is
  unavailable.
- `components/fingerprint/explorer.tsx` — fingerprint list, skill drawer with
  rationale and limitations.
- `components/integrations/panel.tsx`, `components/settings/controls.tsx`,
  `components/onboarding/wizard.tsx`, `components/evidence/actions.tsx`.

Three.js is only imported by the lattice path, so other routes do not carry it
in their bundles.

## Extension as a separate surface

`apps/extension` is a Manifest V3 Chrome extension built by
`scripts/build-extension.mjs` into `apps/extension/dist`. It shares no code with
the web app at runtime; it speaks to the same HTTP API with a scoped bearer
token. See [docs/EXTENSION.md](EXTENSION.md).

## Failure behaviour

- Missing GitHub credentials → integration panel reports "not configured"; no
  fake connection appears.
- Missing Hedera credentials → local adapter, anchors labelled `local`.
- Hedera configured but submission fails → `409`, no batch row; a certificate
  keeps its signature and records `anchorStatus: failed`.
- Insufficient evidence → `estimate: null`, status `insufficient`; the UI says
  proficiency is not established.
- Email not configured → the UI states verification email could not be sent.
- Database unreachable → the route returns `503` with a safe message; errors are
  logged server-side without tokens or payloads.
