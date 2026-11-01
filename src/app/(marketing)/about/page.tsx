import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "What RepuH is, what it refuses to be, and the principles behind the MVP.",
};

export default function AboutPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="label">About</p>
        <p className="mt-2 max-w-[24ch] text-[0.8125rem] leading-relaxed text-muted">
          A professional identity platform that treats evidence as the product, not as decoration.
        </p>
      </aside>

      <article className="doc">
        <h1 className="display text-[clamp(2.4rem,5vw,3.6rem)]">
          People should be able to build a verifiable professional identity through the work they
          actually perform.
        </h1>
        <p className="mt-5 text-[0.9375rem]">
          RepuH observes permitted professional activity, interprets attributable work artifacts,
          organises evidence by capability, and presents estimates with their confidence and
          limitations attached. It is web-first, with a Chrome extension as a companion observer and
          one shared backend.
        </p>

        <h2>What RepuH is not</h2>
        <ul>
          <li>Not a CV builder, job board or recruitment marketplace.</li>
          <li>Not a time-tracking product.</li>
          <li>Not a testing platform. There are no quizzes, coding challenges, timed assessments or artificial skill tests here.</li>
          <li>Not a token economy. No cryptocurrency, paid reputation, purchased scores or paid leaderboard placement.</li>
          <li>Not a native mobile application. The MVP is the responsive web platform plus the extension.</li>
        </ul>

        <h2>The distinctions the product keeps</h2>
        <p>
          Four things are routinely conflated in professional software. RepuH keeps them separate in
          the data model and in the interface:
        </p>
        <table>
          <thead>
            <tr>
              <th>Concept</th>
              <th>What it means here</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Observed activity</td>
              <td>An event was recorded from a connected source. It is not a claim about ability.</td>
            </tr>
            <tr>
              <td>Inferred capability</td>
              <td>A deterministic estimate derived from classified evidence, with confidence reported separately.</td>
            </tr>
            <tr>
              <td>Attributable artifact</td>
              <td>A specific, identifiable contribution that can be examined or disputed.</td>
            </tr>
            <tr>
              <td>Independent corroboration</td>
              <td>The same capability is supported by more than one source or project.</td>
            </tr>
          </tbody>
        </table>

        <h2>Principles, in practice</h2>
        <h3>Evidence before reputation</h3>
        <p>
          Registration date, account age, time in the application and raw event volume do not
          independently produce an impressive score. The scoring curve saturates, signals carry
          different weights, and corroboration is counted separately from volume.
        </p>
        <h3>Privacy before data collection</h3>
        <p>
          Observation is visible, purpose-limited, consent-based and revocable. The product does not
          collect keystrokes, passwords, clipboard contents, private messages, banking or health
          information, unrelated browsing history or screenshots of private sessions.
        </p>
        <h3>Transparent limitations</h3>
        <p>
          Where evidence is insufficient, the interface says proficiency is not yet established. AI
          classifications are labelled provisional. An anchor proves integrity, never skill.
        </p>

        <h2>Status of this deployment</h2>
        <p>
          This is an MVP. It runs as a modular monolith with SQLite persistence behind a repository
          layer, and it documents how to move to the Supabase/Postgres target described in the
          specification. External services that are not configured — mail delivery, GitHub OAuth,
          hosted model inference, testnet RPC — are reported as unavailable rather than simulated.
        </p>
        <p>
          Start with <Link href="/docs">the documentation</Link>, or{" "}
          <Link href="/register">create an identity</Link> and see the empty state for what it is.
        </p>
      </article>
    </div>
  );
}
