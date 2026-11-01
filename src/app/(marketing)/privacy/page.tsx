import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What RepuH collects, why, for how long, and what it refuses to collect.",
};

export default function PrivacyPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="label">Privacy</p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
          Personal activity is private by default. This page states the mechanics, not a promise.
        </p>
      </aside>

      <article className="doc">
        <h1 className="display text-[clamp(2.4rem,5vw,3.4rem)]">
          Collection is purpose-limited, visible, revocable and minimised.
        </h1>

        <h2>What is collected</h2>
        <ul>
          <li><strong>Account data:</strong> email address, a scrypt password hash, and session identifiers hashed at rest.</li>
          <li><strong>Profile data:</strong> the display name, username, headline, biography, country and specialization you provide.</li>
          <li><strong>GitHub metadata</strong> (only after you authorise it): repository name, declared language, topics, visibility, pull request titles and counts, review presence, issue outcomes, releases and push events.</li>
          <li><strong>Browser observation</strong> (off by default): domain, page title, timestamp and time on page for allowlisted documentation domains.</li>
          <li><strong>Product records:</strong> normalized events, classified evidence, scoring snapshots, consent records, audit entries and integrity anchors.</li>
        </ul>

        <h2>What is never collected</h2>
        <ul>
          <li>Keystrokes, clipboard contents, passwords or form field values.</li>
          <li>Private messages, email contents, banking or health information.</li>
          <li>Unrelated browsing history, or any domain outside the allowlist.</li>
          <li>Screenshots of sessions, session cookies from other sites, or full page content.</li>
          <li>Full source code. The GitHub integration reads metadata; it does not clone repositories to compute a score.</li>
        </ul>

        <h2>Purpose and legal basis</h2>
        <p>
          Each observation purpose has a named scope and a version. Consent is recorded as an
          append-only history: a grant and a revocation are both facts with timestamps. Revoking a
          purpose stops new collection immediately; it does not retroactively delete evidence you
          have not asked to remove.
        </p>
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Scope</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>github_observation</code></td>
              <td>Public repository metadata, authored pull requests, reviews, issues</td>
              <td>Not granted until you connect</td>
            </tr>
            <tr>
              <td><code>browser_observation</code></td>
              <td>Allowlisted documentation domains only</td>
              <td>Off</td>
            </tr>
            <tr>
              <td><code>ai_classification</code></td>
              <td>Deterministic metadata classification in this deployment</td>
              <td>Off unless granted</td>
            </tr>
          </tbody>
        </table>

        <h2>Public and private are different queries</h2>
        <p>
          A public profile is a scoped projection built by a separate query. Private activity,
          private evidence, integration tokens, consent records, security history, sensitive project
          identifiers and unauthorised source data are excluded at the query boundary — not hidden in
          the browser. Private profiles do not resolve at a public address at all.
        </p>

        <h2>Retention and deletion</h2>
        <p>
          This MVP deletes immediately. Account deletion removes the account, activity, evidence,
          snapshots, anchors, consent records, sessions and API tokens, and the public URL stops
          resolving. A production deployment would add a documented retention window and a recovery
          period; that difference is stated rather than implied.
        </p>
        <p>
          Export is available at{" "}
          <Link href="/settings#security">Settings → Security and data</Link> and returns a JSON
          document containing your records but not provider tokens or session identifiers.
        </p>

        <h2>Processors and external services</h2>
        <p>
          The MVP does not send data to a hosted model provider. GitHub is contacted only when you
          connect the integration. A testnet RPC is contacted only if credentials are configured. When
          any of these is absent, the interface shows a blocked state rather than a simulated success.
        </p>

        <h2>Your controls</h2>
        <ul>
          <li>Grant or revoke each purpose at <Link href="/settings#observation">Settings → Observation</Link>.</li>
          <li>Set profile visibility, per-item evidence visibility and leaderboard participation independently.</li>
          <li>Export or delete everything at <Link href="/settings#security">Settings → Security and data</Link>.</li>
          <li>Report an incorrect attribution from any evidence record; the item is marked disputed and removed from public projections.</li>
        </ul>

        <p className="mt-8 text-[0.75rem]">
          This page describes the behaviour of the software in this repository. It is not legal advice
          and does not replace a jurisdiction-specific privacy notice.
        </p>
      </article>
    </div>
  );
}
