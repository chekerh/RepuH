import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for the RepuH MVP deployment.",
};

export default function TermsPage() {
  return (
    <article className="doc mx-auto">
      <p className="label">Terms</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,5vw,3.4rem)]">
        An MVP, offered as software rather than as a service level.
      </h1>

      <h2>1. What you are using</h2>
      <p>
        This deployment is a minimum viable implementation of the RepuH specification. It is provided
        for evaluation and development. It is not a production service, has no availability
        commitment, and may be reset or replaced.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for the credentials you choose and for the accuracy of the information
        you publish. Do not create accounts for other people, or connect an integration for an account
        you are not authorised to use.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not attempt to access another person’s private records or to bypass authorization.</li>
        <li>Do not submit fabricated evidence, or attempt to manipulate a score or ranking.</li>
        <li>Do not use the browser companion to observe sites outside its declared allowlist.</li>
        <li>Do not use the platform to harass, impersonate or misrepresent another person.</li>
      </ul>

      <h2>4. Estimates are not claims of fact</h2>
      <p>
        Capability estimates are deterministic functions of attributable evidence. They are
        provisional, they carry confidence values, and they can be wrong. Nothing here is a
        certification, a credential, an employment verification or a professional qualification.
        Blockchain anchors prove the integrity of a commitment; they do not prove a skill.
      </p>

      <h2>5. Third-party services</h2>
      <p>
        GitHub and any configured RPC provider are governed by their own terms. If a provider is not
        configured, the corresponding feature reports a blocked state. No successful external
        interaction is simulated.
      </p>

      <h2>6. Termination</h2>
      <p>
        You may delete your account at any time; deletion is immediate in this MVP. Access may be
        withdrawn from accounts that abuse the platform or attempt to compromise other users.
      </p>

      <h2>7. Liability</h2>
      <p>
        The software is provided “as is”, without warranty of any kind, express or implied, including
        fitness for a particular purpose. To the maximum extent permitted by law, no liability is
        accepted for decisions made on the basis of an estimate produced by this deployment.
      </p>

      <h2>8. Changes</h2>
      <p>
        The specification and this implementation are expected to change. Material changes to
        scoring behaviour increment the algorithm version stored alongside every estimate, so a
        historical number remains interpretable.
      </p>

      <p className="mt-8 text-[0.75rem]">
        This document describes the intent of the MVP implementation. It is not legal advice.
      </p>
    </article>
  );
}
