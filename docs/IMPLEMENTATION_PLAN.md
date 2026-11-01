# Implementation plan

Ten phases, ordered so that every phase leaves something demonstrable and no
phase depends on credentials the environment may not have. The specification's
phase intent is preserved; the delivery order compresses design and foundation
because the repository started empty.

Each phase lists its scope, the acceptance criteria used to judge it, and where
the result lives.

---

## Phase 0 — Reconnaissance

**Scope.** Confirm the repository state, available runtimes, and what external
services are actually reachable. Decide the storage strategy honestly.

**Acceptance.** Written findings; no code.

**Result.** Repository empty (no commits, no files). Node 22 and pnpm available.
No Supabase project, GitHub OAuth app or chain credentials in the environment.
Decision: SQLite behind a repository layer, with the Postgres migration path
documented rather than pretended. Recorded in
[docs/ARCHITECTURE.md](ARCHITECTURE.md) and
[docs/DEPLOYMENT.md](DEPLOYMENT.md).

---

## Phase 1 — Foundation and design system

**Scope.** Next.js App Router + TypeScript strict, Tailwind v4 tokens, primitive
components, layout shells, theming, security headers.

**Acceptance.** `pnpm typecheck` and `pnpm build` pass; tokens resolve in light
and dark; no raw hex outside `globals.css`; focus states visible.

**Result.** `src/app/globals.css`, `src/components/ui.tsx`, `layout.tsx`,
`next.config.ts`. Design documented in [docs/DESIGN.md](DESIGN.md).

---

## Phase 2 — Identity and onboarding

**Scope.** Registration, sign-in, sign-out, recovery request, sessions, scrypt
hashing, onboarding wizard, profile completeness.

**Acceptance.** A new account can register, onboard, sign out and sign back in;
an unauthenticated user is redirected from app routes; a foreign origin cannot
mutate.

**Result.** `src/lib/auth/*`, `src/app/api/auth/*`, `src/app/(auth)/*`,
`src/components/onboarding/wizard.tsx`.

---

## Phase 3 — Activity ingestion and GitHub

**Scope.** Normalised event model, idempotent ingest, GitHub OAuth, sync over
public events and repository metadata, integration panel with honest
not-configured state, labelled development adapter.

**Acceptance.** Re-syncing does not duplicate events; absent credentials show as
unavailable, never as connected; demo records are marked.

**Result.** `src/lib/github/*`, `src/lib/services/ingest.ts`,
`src/lib/demo/*`, `src/app/api/integrations/*`,
`src/components/integrations/panel.tsx`.

---

## Phase 4 — Evidence and ontology

**Scope.** Six-category, 35-skill ontology; evidence signals with weights and
claims; deterministic classification with recorded rules; evidence list, detail,
visibility, dispute and retraction.

**Acceptance.** Every mapping names the rule that produced it; unknown metadata
yields no skill rather than a guess; visibility changes alter the public
projection.

**Result.** `src/lib/ontology/`, `src/lib/evidence/classify.ts`,
`src/app/(app)/evidence/*`, `src/app/(app)/activity/*`.

---

## Phase 5 — Scoring and fingerprint

**Scope.** Deterministic estimate, recency decay, corroboration cap, confidence,
sufficiency gate, skill snapshots, fingerprint UI, skill drawer.

**Acceptance.** Same inputs produce identical output; insufficient evidence
yields `null`, not zero; the drawer reproduces the number from contributions;
unit tests cover the gate, cap, decay and determinism.

**Result.** `src/lib/scoring/`, `src/app/(app)/fingerprint/*`,
`tests/scoring.test.ts`. Method documented in [docs/SCORING.md](SCORING.md).

---

## Phase 6 — Public surface

**Scope.** Public profiles by username, visibility levels, leaderboards with
opt-in, explore, marketing pages, docs surface, 404.

**Acceptance.** Private profiles 404; private evidence never appears in a public
projection; opt-out removes a person from every board; no global or composite
score exists.

**Result.** `src/app/u/[username]/`, `src/app/explore/`,
`src/app/leaderboards/`, `src/app/(marketing)/*`.

---

## Phase 7 — Integrity, Hedera and certificates

**Scope.** Canonical commitments, Merkle tree and proofs, batching, Hedera HCS
provider with local fallback, Ed25519 certificate issuance and public
verification, export and deletion.

**Acceptance.** Altered commitment fails verification; proofs regenerate from
stored commitments; `confirmed` only after a topic sequence number; certificates
recompute hash and signature; unanchored certificates say so; deletion states
what is irreversible.

**Result.** `src/lib/integrity/`, `src/lib/hedera/`, `src/lib/blockchain/`,
`src/lib/certificates/`, `contracts/EvidenceAnchor.sol`,
`tests/{merkle,certificate,hedera}.test.ts`. Documented in
[docs/HEDERA.md](HEDERA.md), [docs/CERTIFICATES.md](CERTIFICATES.md) and
[docs/BLOCKCHAIN.md](BLOCKCHAIN.md).

---

## Phase 8 — Browser companion

**Scope.** Manifest V3 extension, allowlist, session accounting, durable queue,
pairing token, consent gating, build script.

**Acceptance.** `pnpm extension:build` emits a loadable `dist`; queued events
survive worker termination; ingestion refuses without consent; off-allowlist
domains are discarded server-side.

**Result.** `apps/extension/`, `scripts/build-extension.mjs`,
`src/app/api/extension/*`. Documented in [docs/EXTENSION.md](EXTENSION.md).

---

## Phase 9 — Hardening and launch readiness

**Scope.** Security headers, same-origin checks, rate limits, audit log, privacy
export and deletion, tests, documentation, honest limitation register.

**Acceptance.** Typecheck, tests and build pass; no secret in the client bundle;
every unconfigured capability states so; known gaps written down.

**Result.** `docs/SECURITY.md`, this plan, `docs/IMPLEMENTATION_PROGRESS.md`,
`README.md`.

---

## Sequencing rules used

1. **No phase waits on a credential.** Every external dependency has a
   documented, labelled fallback that is visibly not the real thing.
2. **Deterministic core before UI.** Scoring, classification and integrity were
   written and tested before the surfaces that display them.
3. **Projection, not filtering.** Visibility is applied when the public query is
   built, not when the response is serialised.
4. **Honesty is a feature.** `null` estimates, `local` anchors, "not configured"
   panels and DEMO badges are acceptance criteria, not polish.

## What is explicitly deferred

Multi-profession ontology, team and organisation profiles, recruiter search,
billing, real email delivery, LLM classification, domain verification for public
profiles, webhooks, real chain confirmation, mobile apps, notifications,
internationalisation beyond a language preference, and any form of ranking
across deployments.

These are deferred because they either need infrastructure not present here or
would require the product to make claims it currently cannot support.
