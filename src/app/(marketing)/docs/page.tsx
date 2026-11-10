import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Architecture, scoring method, security model, API surface, extension and limitations of the RepuH MVP.",
};

export default function DocsPage() {
  return (
    <div className="grid min-w-0 gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="label">Implementation</p>
        <nav aria-label="Documentation sections" className="mt-3 space-y-1.5 text-[0.8125rem]">
          {[
            ["architecture", "Architecture"],
            ["scoring", "Scoring method"],
            ["data-model", "Data model"],
            ["api", "API surface"],
            ["security", "Security and privacy"],
            ["extension", "Chrome extension"],
            ["blockchain", "Integrity and anchoring"],
            ["development-adapter", "Development adapter"],
            ["limitations", "Known limitations"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block text-muted transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <p className="mt-6 border-t border-border pt-3 text-[0.6875rem] leading-relaxed text-muted">
          Long-form documents also live in <code className="font-mono">docs/</code> in the repository.
        </p>
      </aside>

      <article className="doc min-w-0">
        <h1 className="display text-[clamp(2.4rem,5vw,3.4rem)]">
          How this implementation works, and where it stops.
        </h1>
        <p className="mt-5 text-[0.9375rem]">
          RepuH is a modular monolith. Presentation, authentication, integrations, activity
          normalization, evidence, the ontology, deterministic scoring, public projection, integrity
          anchoring and extension ingestion have explicit boundaries, but they run as one deployable
          application. Kafka, Kubernetes, ClickHouse and independent microservices are deliberately
          absent; nothing demonstrated requires them yet.
        </p>

        <h2 id="architecture">Architecture</h2>
        <table>
          <thead>
            <tr>
              <th>Boundary</th>
              <th>Location</th>
              <th>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Web presentation</td><td><code>src/app</code></td><td>Routes, layouts, server components, client islands</td></tr>
            <tr><td>Authentication</td><td><code>src/lib/auth</code></td><td>Password hashing, sessions, bearer tokens, guards</td></tr>
            <tr><td>Integrations</td><td><code>src/lib/github</code></td><td>OAuth, sync, normalization, rate-limit handling</td></tr>
            <tr><td>Ontology</td><td><code>src/lib/ontology</code></td><td>Categories, skills, signals, definitions, limitations</td></tr>
            <tr><td>Classification</td><td><code>src/lib/evidence</code></td><td>Event → skill mapping with recorded rules</td></tr>
            <tr><td>Scoring</td><td><code>src/lib/scoring</code></td><td>Deterministic estimate, confidence, rationale</td></tr>
            <tr><td>Integrity</td><td><code>src/lib/integrity</code></td><td>Canonical hashing, Merkle trees, inclusion proofs</td></tr>
            <tr><td>Persistence</td><td><code>src/lib/db</code></td><td>Schema, migrations, scoped queries</td></tr>
            <tr><td>Extension</td><td><code>apps/extension</code></td><td>Manifest V3 observer, queue, popup</td></tr>
          </tbody>
        </table>
        <p>
          The target architecture in the specification is Next.js with Supabase/PostgreSQL, Row Level
          Security and Supabase Storage. This MVP uses SQLite behind the same repository interface so
          the product runs from a clean checkout with no external account. The migration path is
          described in <code>docs/ARCHITECTURE.md</code> and <code>docs/DATA_MODEL.md</code>.
        </p>

        <h2 id="scoring">Scoring method</h2>
        <p>
          For each capability the engine collects evidence items whose classification includes that
          skill and whose signal the ontology declares credible for it. Each item contributes:
        </p>
        <p>
          <code>effective = baseWeight(signal) × quality × 0.5^(ageDays / 180)</code>
        </p>
        <p>
          The total is multiplied by corroboration credits for independent projects and sources, then
          passed through a saturating curve so that volume cannot grow a score without limit:
        </p>
        <p>
          <code>estimate = 100 × (1 − e^(−weighted / 3.4))</code>
        </p>
        <p>Confidence is computed separately from volume, span and mean quality, capped at 95%.</p>

        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Base weight</th>
              <th>Claim it supports</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Merged pull request</td><td>1.00</td><td>A completed, reviewed contribution</td></tr>
            <tr><td>Release</td><td>0.55</td><td>A shipped version</td></tr>
            <tr><td>Code review</td><td>0.60</td><td>Participation in another person’s change</td></tr>
            <tr><td>Documentation</td><td>0.50</td><td>Written explanation of a system</td></tr>
            <tr><td>Commit series</td><td>0.42</td><td>Sustained development activity</td></tr>
            <tr><td>Issue resolution</td><td>0.40</td><td>Diagnosis and resolution of a problem</td></tr>
            <tr><td>Repository</td><td>0.18</td><td>An attributable body of work exists</td></tr>
            <tr><td>Observed session</td><td>0.12</td><td>Permitted documentation browsing</td></tr>
          </tbody>
        </table>

        <h3>Published states</h3>
        <ul>
          <li><strong>Insufficient:</strong> no estimate is published. One isolated item never creates a number.</li>
          <li><strong>Provisional:</strong> an estimate exists; confidence or corroboration is not yet sufficient.</li>
          <li><strong>Established:</strong> confidence ≥ 62%, at least four evidence items and at least two projects.</li>
        </ul>
        <p>
          Every estimate records its algorithm version, its contribution trace and its limitations. The
          same inputs always produce the same output, so any published figure can be recomputed.
        </p>

        <h2 id="data-model">Data model</h2>
        <p>
          All tables use UUID text primary keys, explicit status fields, timestamps and idempotency
          constraints. The central tables are <code>users</code>, <code>profiles</code>,{" "}
          <code>user_preferences</code>, <code>integrations</code>, <code>activity_events</code>,{" "}
          <code>projects</code>, <code>evidence</code>, <code>skill_snapshots</code>,{" "}
          <code>blockchain_anchors</code>, <code>consent_records</code>, <code>api_tokens</code> and{" "}
          <code>audit_logs</code>.
        </p>
        <ul>
          <li><code>activity_events</code> is unique on <code>(user_id, source, external_id)</code>, so repeated syncs cannot duplicate a contribution.</li>
          <li><code>evidence</code> is unique on <code>event_id</code>. One classified record per event.</li>
          <li><code>skill_snapshots</code> is append-only, so historical evolution is reconstructable.</li>
          <li><code>consent_records</code> is append-only; revocation is a new row, never an overwrite.</li>
        </ul>

        <h2 id="api">API surface</h2>
        <table>
          <thead>
            <tr><th>Route</th><th>Method</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td><code>/api/auth/register</code></td><td>POST</td><td>Create an account and session</td></tr>
            <tr><td><code>/api/auth/login</code></td><td>POST</td><td>Verify credentials, start a session</td></tr>
            <tr><td><code>/api/auth/logout</code></td><td>POST</td><td>End the current session</td></tr>
            <tr><td><code>/api/onboarding</code></td><td>POST</td><td>Identity, profession, visibility, consent</td></tr>
            <tr><td><code>/api/profile</code></td><td>GET, PATCH</td><td>Private profile read and update</td></tr>
            <tr><td><code>/api/profile/public/[username]</code></td><td>GET</td><td>Scoped public projection</td></tr>
            <tr><td><code>/api/integrations</code></td><td>GET</td><td>Connection status</td></tr>
            <tr><td><code>/api/integrations/github/connect</code></td><td>GET</td><td>OAuth redirect, or explicit 409</td></tr>
            <tr><td><code>/api/integrations/github/callback</code></td><td>GET</td><td>State check, token exchange, first sync</td></tr>
            <tr><td><code>/api/integrations/github/sync</code></td><td>POST</td><td>Idempotent incremental sync</td></tr>
            <tr><td><code>/api/integrations/github/disconnect</code></td><td>POST</td><td>Remove the connection</td></tr>
            <tr><td><code>/api/integrations/github/demo</code></td><td>POST</td><td>Seed the labelled development adapter</td></tr>
            <tr><td><code>/api/activity</code></td><td>GET</td><td>Filtered events and summary</td></tr>
            <tr><td><code>/api/evidence</code></td><td>GET</td><td>Evidence explorer</td></tr>
            <tr><td><code>/api/evidence/[id]</code></td><td>GET, PATCH</td><td>Detail, per-item visibility</td></tr>
            <tr><td><code>/api/evidence/[id]/report</code></td><td>POST</td><td>Dispute an attribution</td></tr>
            <tr><td><code>/api/fingerprint</code></td><td>GET</td><td>Full capability fingerprint</td></tr>
            <tr><td><code>/api/fingerprint/[skillId]</code></td><td>GET</td><td>Explain one capability</td></tr>
            <tr><td><code>/api/leaderboards</code></td><td>GET</td><td>Per-capability rankings</td></tr>
            <tr><td><code>/api/leaderboards/[skillId]</code></td><td>GET</td><td>Rankings for one capability</td></tr>
            <tr><td><code>/api/extension/token</code></td><td>POST</td><td>Mint a hashed bearer token</td></tr>
            <tr><td><code>/api/extension/events</code></td><td>POST</td><td>Allowlisted observation ingestion</td></tr>
            <tr><td><code>/api/extension/status</code></td><td>GET</td><td>Pairing and observation state</td></tr>
            <tr><td><code>/api/blockchain/anchors</code></td><td>GET, POST</td><td>List or create a Merkle batch</td></tr>
            <tr><td><code>/api/blockchain/verify</code></td><td>POST</td><td>Verify an inclusion proof</td></tr>
            <tr><td><code>/api/certificates</code></td><td>GET, POST</td><td>List or issue a signed capability certificate</td></tr>
            <tr><td><code>/api/certificates/[id]</code></td><td>GET</td><td>Public certificate and its verification</td></tr>
            <tr><td><code>/api/certificates/key</code></td><td>GET</td><td>Published Ed25519 public key</td></tr>
            <tr><td><code>/api/privacy/consent</code></td><td>POST</td><td>Grant or revoke a purpose</td></tr>
            <tr><td><code>/api/privacy/export</code></td><td>GET</td><td>JSON export</td></tr>
            <tr><td><code>/api/privacy/delete</code></td><td>POST</td><td>Delete the account and its records</td></tr>
          </tbody>
        </table>
        <p>
          Mutating handlers validate input with Zod, check the request origin, apply the authenticated
          identity server-side, rate-limit authentication and synchronization, and return consistent
          errors that never include provider tokens or internal exceptions.
        </p>

        <h2 id="security">Security and privacy</h2>
        <ul>
          <li><strong>Passwords:</strong> scrypt with a per-password salt, constant-time comparison.</li>
          <li><strong>Sessions:</strong> 32-byte random tokens, stored as SHA-256 hashes, HttpOnly, SameSite=Lax, Secure in production, 30-day expiry.</li>
          <li><strong>Extension tokens:</strong> separate hashed bearer credentials with a 30-day expiry; the raw token is returned once.</li>
          <li><strong>Provider tokens:</strong> AES-256-GCM encrypted at rest with a key derived from <code>REPUH_APP_SECRET</code>.</li>
          <li><strong>Authorization:</strong> every private query includes the authenticated user id. Client-supplied identifiers never override it.</li>
          <li><strong>CSRF:</strong> SameSite cookies plus an origin check on every mutation.</li>
          <li><strong>Audit:</strong> authentication, consent, integration, evidence, privacy and anchoring actions are recorded without sensitive payloads.</li>
        </ul>
        <p>
          <strong>Known gap:</strong> email verification is not delivered in this deployment. Accounts
          are marked verified on first successful sign-in, and the interface states this. The full
          threat model is in <code>docs/SECURITY.md</code>.
        </p>

        <h2 id="extension">Chrome extension</h2>
        <p>
          Manifest V3, no bundler required at runtime. Source lives in <code>apps/extension/src</code>;
          <code>pnpm extension:build</code> produces <code>apps/extension/dist</code>.
        </p>
        <ol>
          <li>Run <code>pnpm extension:build</code>.</li>
          <li>Open <code>chrome://extensions</code> and enable Developer mode.</li>
          <li>Choose “Load unpacked” and select <code>apps/extension/dist</code>.</li>
          <li>Open the popup, paste a pairing token from <Link href="/extension">/extension</Link>, and save.</li>
          <li>The popup shows connection state, allowlist, queue depth and pause. Pausing stops ingestion immediately.</li>
        </ol>
        <p>
          The service worker stores a bounded, durable queue in <code>chrome.storage.local</code> and
          retries with exponential backoff. If the worker is terminated by the browser, the queue
          survives and resumes. It is not published to the Chrome Web Store.
        </p>

        <h2 id="blockchain">Integrity and anchoring</h2>
        <p>
          Evidence stays off-chain. The commitment is a SHA-256 hash over a canonical JSON object
          containing a hash version, the evidence id, the signal, the timestamp and a content digest.
          It excludes names, email addresses, estimates, project identifiers and raw payloads.
        </p>
        <p>
          Commitments are leaf-hashed and paired upward to a Merkle root. Inclusion proofs are stored
          implicitly: a proof is regenerated from the batch commitments on verification. When{" "}
          <code>HEDERA_CONTRACT_ID</code> is set, the root is submitted to the{" "}
          <code>EvidenceAnchor</code> smart contract on Hedera, and the batch is marked{" "}
          <code>confirmed</code> only after the call succeeds and <code>getRoot</code> returns the
          submitted root. Without a contract, a configured {" "}
          <code>HEDERA_TOPIC_ID</code> anchors the root through the consensus service instead. With
          neither, the local adapter records a deterministic reference and every record is labelled{" "}
          <code>local</code>.
        </p>
        <p>
          A certificate is a canonical JSON claim signed with Ed25519: one capability, its estimate,
          confidence, algorithm version, limitations and evidence root. The public key is published at
          <code>/api/certificates/key</code>, so a downloaded certificate can be verified offline. When
          Hedera is configured, the certificate hash is also submitted to the consensus service; the
          anchor is stored beside the signature, never inside it.
        </p>

        <h2 id="development-adapter">Development adapter</h2>
        <p>
          When <code>REPUH_DEMO_MODE</code> is enabled, the application seeds five labelled demo
          profiles and offers a per-account dataset. Every resulting row has{" "}
          <code>is_demo = true</code>, and the UI renders a DEMO badge on the item, the profile and the
          navigation banner. Demo profiles are excluded from any claim about live usage.
        </p>
        <p>
          To activate a real integration: create a GitHub OAuth App, set{" "}
          <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code>, set the callback to{" "}
          <code>/api/integrations/github/callback</code>, disable demo mode, then connect from
          Integrations. The sync endpoint can be called by a scheduler when{" "}
          <code>REPUH_CRON_SECRET</code> is set. Webhooks are documented but not registered.
        </p>

        <h2 id="limitations">Known limitations</h2>
        <ul>
          <li>Persistence is SQLite, not Supabase/Postgres with Row Level Security. The repository interface is the migration seam.</li>
          <li>Email verification and password-recovery delivery are not configured.</li>
          <li>GitHub sync uses the public events API and repository metadata; file-level language detection is limited to what the API declares.</li>
          <li>The classifier is deterministic and conservative. It does not read code, so it cannot judge quality.</li>
          <li>No hosted LLM inference. The adapter interface is documented but not enabled.</li>
          <li>Hedera anchoring is testnet-ready but was not exercised against a live operator in this deployment; the local adapter is not on-chain.</li>
          <li>Certificates are signed JSON, not PDFs or W3C Verifiable Credentials; revocation has no endpoint or UI.</li>
          <li>The extension is loadable unpacked only, with no store listing or remote updates.</li>
          <li>Leaderboards order a single capability within one deployment; they are not a global or longitudinal ranking.</li>
        </ul>

        <p className="mt-8 text-[0.75rem]">
          Design decisions, the threat model, scoring details and the migration path are recorded in
          the repository under <code>docs/</code>.
        </p>
      </article>
    </div>
  );
}
