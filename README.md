# RepuH

An evolving representation of demonstrated capability, built from real
professional activity and verifiable evidence.

RepuH does not run quizzes, coding challenges, timed assessments or any other
platform-administered test. It reads attributable work, classifies it against a
published competency ontology, and reports an estimate **with its confidence and
its limits attached**.

> MVP implementation. It is not a production deployment and it does not claim to
> be one. External services that are not configured are reported as unavailable
> rather than simulated.

---

## What is in the box

| Surface | Status |
| --- | --- |
| Responsive web platform (Next.js 16, App Router) | Working |
| Deterministic scoring engine + skill ontology | Working, unit-tested |
| Evidence classification with recorded rules | Working, unit-tested |
| SQLite persistence behind a repository layer | Working |
| Authentication (scrypt, hashed sessions, bearer tokens) | Working |
| Onboarding, dashboard, fingerprint, activity, evidence, leaderboards, explore, settings, public profiles | Working |
| 3D capability lattice (React Three Fiber) | Working |
| Chrome extension (Manifest V3, durable queue) | Buildable, loadable unpacked |
| Merkle integrity, inclusion proofs, verification UI | Working |
| Ed25519 evidence certificates + public verification | Working |
| Hedera Consensus Service anchoring | Implemented; requires operator + topic |
| GitHub OAuth + sync | Implemented; requires credentials |
| Labelled development adapter | Working when `REPUH_DEMO_MODE=true` |
| Email verification / recovery delivery | **Not configured** (stated in the UI) |
| Hosted LLM classifier | **Not enabled** (deterministic classifier ships instead) |
| Mainnet anchoring | **Not deployed** (testnet-ready, local adapter by default) |

---

## Requirements

- Node.js ≥ 22
- pnpm ≥ 9 (`npm i -g pnpm`)

## Quick start

```bash
pnpm install
cp .env.example .env.local     # then set REPUH_APP_SECRET
pnpm dev                       # http://localhost:3000
```

The first server start creates `data/repuh.db`, runs the schema, and — when
`REPUH_DEMO_MODE` is enabled (the default outside production) — seeds five
**labelled demo profiles** so leaderboards, explore and public profiles have
something honest to show.

Generate a secret:

```bash
openssl rand -base64 48
```

### Demo accounts

Only when the development adapter is enabled:

```
aisha.rahman@demo.repuh.local    / repuh-demo-password
marcus.oyelaran@demo.repuh.local / repuh-demo-password
lena.fischer@demo.repuh.local    / repuh-demo-password
diego.salas@demo.repuh.local     / repuh-demo-password
priya.nair@demo.repuh.local      / repuh-demo-password
```

Every record created from this dataset carries `is_demo = true` and renders with
a DEMO badge.

## Scripts

```bash
pnpm dev              # development server
pnpm build            # production build
pnpm start            # serve the production build
pnpm typecheck        # tsc --noEmit (strict)
pnpm lint             # eslint
pnpm test             # unit tests (node:test + tsx)
pnpm db:seed          # seed the labelled demo network (safe to re-run)
pnpm extension:build  # → apps/extension/dist
```

## Chrome extension

```bash
pnpm extension:build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select `apps/extension/dist`.
3. In the web app open **Browser companion** (`/extension`) and create a pairing
   token; paste it into the popup (or pass `?ext=<extension id>` to deliver it
   automatically).
4. Grant **Browser observation** consent in Settings → Observation. Without it
   the extension queues events and the API refuses them with `403`.
5. Pause at any time from the popup; the queue survives service-worker
   termination.

It is not published to the Chrome Web Store and has no store listing.

## Enabling real integrations

### GitHub

1. Create an OAuth App at <https://github.com/settings/developers>.
2. Callback URL: `${NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`.
3. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
4. Set `REPUH_DEMO_MODE=false`.
5. Connect from **Integrations**. The first sync runs automatically.

Requested scope is `read:user public_repo`: public repository metadata, pull
requests you authored, reviews and issues. Private repositories are not
requested. No source code is downloaded.

Scheduled sync: call `POST /api/integrations/github/sync` from an authenticated
scheduler with `Authorization: Bearer <REPUH_CRON_SECRET>`. Webhooks are
documented but not registered.

### Hedera anchoring and certificates

Evidence batches are anchored in the `EvidenceAnchor` smart contract
(`contracts/EvidenceAnchor.sol`, Hedera Smart Contract Service). Certificate
hashes go to a Hedera Consensus Service topic.

1. Create an operator at <https://portal.hedera.com> and fund it with test HBAR.
2. Put `HEDERA_OPERATOR_ID` and `HEDERA_OPERATOR_KEY` in `.env.local`.
3. Run `pnpm contracts:build` then `pnpm contracts:deploy`; it prints the
   `HEDERA_CONTRACT_ID` to add. Evidence batches now call `submitRoot`.
4. Optionally run `pnpm hedera:setup`; it prints the `HEDERA_TOPIC_ID` used for
   certificate hashes.
5. Restart the app. The settings Integrity panel reports the active provider,
   contract id and transaction; the certificate page reports topic and sequence.

Provider precedence is contract → consensus topic → deterministic **local**
adapter, which labels every batch `local (not on-chain)`. The app never claims a
confirmation it did not observe: a contract anchor is `confirmed` only after
`submitRoot` succeeds and `getRoot` reads the root back.

Certificates are Ed25519-signed regardless of Hedera. Their public key is at
`/api/certificates/key`, so a downloaded certificate can be verified offline.
See [docs/HEDERA.md](docs/HEDERA.md) and [docs/CERTIFICATES.md](docs/CERTIFICATES.md).

## Verify the behaviour

```bash
pnpm typecheck      # passes
pnpm test           # 55 unit tests: scoring, classification, Merkle, anchoring, certificates, HCS envelopes, contract
pnpm build          # passes
pnpm extension:build
```

Manual acceptance:

1. Register → onboarding → dashboard shows the honest empty state.
2. Enable the development adapter → dashboard, fingerprint, activity, evidence
   and integrity populate with DEMO-labelled data.
3. Open a skill in the fingerprint → drawer explains the estimate, confidence,
   supporting evidence and limitations.
4. Change an evidence item's visibility → the public profile projection changes;
   private items never appear.
5. Anchor a batch → verify an inclusion proof; alter the commitment and watch it
   fail.
6. Issue a certificate for a capability with an estimate → open the public page,
   check the signature, download the JSON, verify it against the published key.
7. Export data; delete an account and confirm the public URL stops resolving.

## Architecture in one paragraph

A modular monolith. Presentation, authentication, integrations, normalization,
evidence, ontology, deterministic scoring, public projection, integrity and
extension ingestion are separate modules with explicit interfaces, deployed as
one Next.js application. SQLite sits behind a repository layer
(`src/lib/db/queries.ts`) so the target PostgreSQL/Supabase migration is a
storage swap rather than a rewrite. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/SCORING.md](docs/SCORING.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [docs/DESIGN.md](docs/DESIGN.md)
- [docs/API.md](docs/API.md)
- [docs/EXTENSION.md](docs/EXTENSION.md)
- [docs/HEDERA.md](docs/HEDERA.md)
- [docs/CERTIFICATES.md](docs/CERTIFICATES.md)
- [docs/BLOCKCHAIN.md](docs/BLOCKCHAIN.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md)

## Known limitations

Stated, not hidden:

- SQLite, not Postgres with Row Level Security. Authorization is enforced in
  server-side queries.
- No email delivery: accounts are marked verified on first successful sign-in.
- GitHub sync uses the public events API (90 days, 300 events) plus repository
  metadata; it cannot see private repositories without a broader scope.
- The classifier is deterministic and metadata-only. It cannot judge code
  quality and says so.
- Domain verification for public profiles is not implemented; README icons and
  names are placeholders.
- Hedera anchoring is testnet-ready but **unverified here**: no operator
  credentials exist in this environment, so the contract has not been deployed
  and no real `submitRoot` call or HCS submission has been executed. Local
  anchoring is not on-chain. The contract is unaudited and has no upgrade proxy.
- Certificates are JSON, not PDFs, and are not W3C Verifiable Credentials.
  Revocation is modelled in the schema but has no endpoint or UI.
- The generated certificate signing key lives in the database when
  `REPUH_CERT_SIGNING_KEY` is absent. Set the variable in a real deployment.
- The Solidity contract is an alternative design, unaudited and unused.
- Leaderboards rank one capability within one deployment. There is no global
  ranking and no composite score.

## License

The repository is provided for evaluation. Third-party dependencies retain their
own licenses; no third-party code was vendored into `src/`.
