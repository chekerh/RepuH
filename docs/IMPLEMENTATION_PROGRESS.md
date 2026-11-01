# Implementation progress

Last verified: **1 November 2026**.
Repository: `RepuH` (started empty — no commits, no files).

## Verification log

Commands run from the repository root, in this order, with `pipefail` set:

| Command | Result |
| --- | --- |
| `pnpm typecheck` | **pass** — `tsc --noEmit`, strict, zero errors |
| `pnpm lint` | **pass** — ESLint flat config, zero errors and zero warnings |
| `pnpm test` | **pass** — 41 tests, 0 failures |
| `pnpm build` | **pass** — 34 API handlers and 25 pages compiled |
| `pnpm extension:build` | **pass** — `apps/extension/dist` emitted |

Not run, and why:

- No browser end-to-end suite; there is no Playwright/Chrome harness in this
  environment.
- No Solidity compilation; Foundry/Hardhat are not installed.
- No live GitHub OAuth flow; no OAuth app credentials are present.
- No email delivery test; no mail provider is configured.

## Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| 0 — Reconnaissance | Complete | Empty repo, Node 22 + pnpm, no external credentials |
| 1 — Foundation and design system | Complete | Tokens, primitives, shells, headers |
| 2 — Identity and onboarding | Complete | scrypt, hashed sessions, wizard, guards |
| 3 — Ingestion and GitHub | **Partial** | Code complete; OAuth needs credentials |
| 4 — Evidence and ontology | Complete | 35 skills, 6 categories, 8 signals, rules recorded |
| 5 — Scoring and fingerprint | Complete | Deterministic, unit-tested |
| 6 — Public surface | Complete | Profiles, boards, explore, marketing |
| 7 — Integrity and anchoring | **Partial** | Merkle, certificates and Hedera adapter work; no live HCS submit (no credentials) |
| 8 — Browser companion | **Partial** | Builds and loads; not store-published |
| 9 — Hardening and docs | Complete | Security, docs, limitation register |

## What actually works end to end

1. Register → onboard → empty dashboard with a designed empty state.
2. Enable the labelled development adapter → five demo profiles, evidence,
   snapshots, anchors.
3. Fingerprint: estimates with confidence, status, contributions, rationale and
   limitations; drawer reproduces the arithmetic.
4. Activity timeline with filters; evidence visibility, dispute and retraction.
5. Public profile projection changes with visibility; private profiles 404.
6. Leaderboards restricted to opted-in public profiles; no composite score.
7. Anchor a batch, verify an inclusion proof, watch a tampered commitment fail,
   and confirm a second anchor refuses to re-anchor the same evidence.
8. Issue a certificate, verify its Ed25519 signature against the published key,
   download the JSON, and see the anchor state stated honestly.
9. Extension build → load unpacked → pair → consent → queued events ingested.
10. Export JSON; delete account; public URL stops resolving.
11. 3D lattice renders with a 2D fallback and reduced-motion support.

## Known gaps (deliberate, documented)

| Gap | Impact | Path |
| --- | --- | --- |
| SQLite, not Postgres/RLS | No database-level isolation | [ARCHITECTURE](ARCHITECTURE.md#why-sqlite-here-supabase-in-production) |
| No email delivery | Address ownership unproven | [SECURITY](SECURITY.md#differences-from-the-target-architecture) |
| In-process rate limiting | Per-instance only | [SECURITY](SECURITY.md#rate-limiting) |
| GitHub OAuth unconfigured | No real sync in this environment | [DEPLOYMENT](DEPLOYMENT.md#environment) |
| No live HCS submit | Adapter complete; needs operator + topic | [HEDERA](HEDERA.md#verification-performed-for-this-mvp) |
| No certificate revocation API | `status` exists, no action | [CERTIFICATES](CERTIFICATES.md#what-is-not-implemented) |
| Contract unaudited/undeployed | Reference only | `contracts/README.md` |
| No domain verification | Placeholder icons/names on profiles | README limitations |
| Deterministic classifier only | Metadata-level claims; cannot judge code quality | [SCORING](SCORING.md) |
| Extension not store-published | Manual unpacked install | [EXTENSION](EXTENSION.md) |
| No E2E browser tests | UI verified by build + manual inspection | this page |

## Tests

`tests/` covers the parts where a wrong answer would be invisible in the UI:

- **`scoring.test.ts`** (9): null on no evidence; single commit insufficient;
  single merged PR provisional; determinism; recency decay; saturation; ontology
  signal gating; corroboration raises confidence; no aggregate score.
- **`merkle.test.ts`** (8): canonical ordering, commitment determinism,
  single-leaf root, even/odd trees, proof verification, tampered leaf fails,
  tampered root fails, out-of-range index, content commitment excludes identity.
- **`classify.test.ts`** (9): language from metadata not name, path rules,
  review depth, attribution downgrade, unknown metadata yields no skill,
  deterministic output, quality bounds.
- **`certificate.test.ts`** (7): payload carries limitations; canonical form and
  hash are stable; a changed estimate changes the hash; genuine Ed25519 signature
  verifies; tampered claim fails; invalid root and out-of-range estimate rejected;
  the Merkle root covers exactly the evidence the estimate counted (`evidence.count`
  equals `claim.evidenceCount` — regression guard for the count-mismatch fix).
- **`hedera.test.ts`** (5): anchor envelope shape and byte limit; no PII fields;
  invalid root and empty batch rejected; certificate envelope identifies its hash;
  malformed hash rejected.
- **`anchoring.test.ts`** (3): commitment differs from content hash; already
  anchored commitments are excluded; nothing pending when all are anchored.

## Next steps if this continues

1. Move to Postgres + RLS and re-run the isolation tests against the database.
2. Add transactional email and real verification/recovery.
3. Wire a real GitHub App (not OAuth app) for private-repo opt-in with narrower
   scopes.
4. Replace the deterministic classifier with a versioned model behind the same
   interface, keeping reasons and limitations.
5. Run `pnpm hedera:setup` against a funded testnet operator, then verify the
   first anchor and certificate on HashScan and via the mirror node.
6. Add Playwright coverage for the ten acceptance flows above.
