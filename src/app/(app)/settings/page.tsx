import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import {
  AnchorControls,
  ConsentSettings,
  DataSettings,
  PreferenceSettings,
  ProfileSettingsForm,
} from "@/components/settings/controls";
import { requireOnboarded } from "@/lib/auth/session";
import { latestConsents, listAnchors } from "@/lib/db/queries";
import { hederaStatus } from "@/lib/hedera/config";
import { providerStatus } from "@/lib/blockchain";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border pt-6">
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <h2 className="text-[0.9375rem] font-medium">{title}</h2>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireOnboarded();
  const consents = latestConsents(user.id);
  const anchors = listAnchors(user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Every control on this page has real backend behaviour. Where a capability depends on an external service, the state says so instead of implying it works."
        actions={
          <Link
            href={`/u/${user.profile.username}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View public profile <ArrowUpRight size={12} />
          </Link>
        }
      />

      <Section
        id="account"
        title="Account"
        description="Identity details for the account itself. Email change and verification delivery are intentionally not simulated."
      >
        <dl className="divide-y divide-border border-y border-border text-[0.8125rem]">
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted">Verification</dt>
            <dd>
              {user.emailVerified ? (
                <Badge tone="success">Verified</Badge>
              ) : (
                <Badge tone="warning">Not verified</Badge>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted">RepuH identifier</dt>
            <dd className="num font-mono text-[0.75rem]">{user.profile.publicId}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted">Profession</dt>
            <dd className="font-medium">Software engineer</dd>
          </div>
        </dl>
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
          No mail provider is configured in this deployment. Accounts are marked verified on the
          first successful sign-in; the security documentation states this explicitly.
        </p>
        <div className="mt-4">
          <Link
            href="/onboarding?repeat=1"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
          >
            Repeat onboarding
          </Link>
        </div>
      </Section>

      <Section
        id="profile"
        title="Profile"
        description="The public projection is generated from these fields. Claims in the biography are unverified and are labelled as such."
      >
        <ProfileSettingsForm
          initial={{
            displayName: user.profile.displayName,
            headline: user.profile.headline ?? "",
            bio: user.profile.bio ?? "",
            country: user.profile.country ?? "",
            specialization: user.profile.specialization ?? "",
            visibility: user.profile.visibility,
          }}
        />
      </Section>

      <Section
        id="observation"
        title="Observation and consent"
        description="Purpose-limited, revocable, and recorded with a version. Revoking takes effect immediately."
      >
        <ConsentSettings
          initial={{
            github_observation: Boolean(consents.github_observation),
            browser_observation: Boolean(consents.browser_observation),
            ai_classification: Boolean(consents.ai_classification),
          }}
        />
      </Section>

      <Section
        id="privacy"
        title="Privacy"
        description="Visibility and leaderboard participation are independent decisions."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 border-y border-border py-4">
            {user.profile.visibility === "private" ? (
              <EyeOff size={16} className="mt-0.5 text-muted" />
            ) : (
              <Eye size={16} className="mt-0.5 text-primary" />
            )}
            <div>
              <p className="text-[0.8125rem] font-medium">
                {user.profile.visibility === "private"
                  ? "Private profile"
                  : user.profile.visibility === "public"
                    ? "Public profile"
                    : "Selectively shared profile"}
              </p>
              <p className="mt-1 max-w-[56ch] text-[0.8125rem] leading-relaxed text-muted">
                {user.profile.visibility === "private"
                  ? "No public projection exists. /u/ addresses do not resolve."
                  : "A scoped projection is served at your public address. Private activity, tokens, consent records and unshared evidence are excluded by the query, not by the browser."}
              </p>
              <Link href="#profile" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                Change visibility
              </Link>
            </div>
          </div>

          <div className="flex items-start gap-3 border-b border-border py-4">
            <Lock size={16} className="mt-0.5 text-muted" />
            <div>
              <p className="text-[0.8125rem] font-medium">
                Leaderboards: {user.preferences.leaderboardOptIn ? "opted in" : "not opted in"}
              </p>
              <p className="mt-1 max-w-[56ch] text-[0.8125rem] leading-relaxed text-muted">
                Separate opt-in. Even when enabled, a skill only appears when it has at least two
                evidence items and a public profile.
              </p>
              <Link href="#preferences" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                Change preference
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="preferences"
        title="Preferences"
        description="Display and notification behaviour stored with the account, not only in this browser."
      >
        <PreferenceSettings
          initial={{
            theme: user.preferences.theme,
            reducedMotion: user.preferences.reducedMotion,
            notifications: user.preferences.notifications,
            leaderboardOptIn: user.preferences.leaderboardOptIn,
          }}
        />
      </Section>

      <Section
        id="integrity"
        title="Integrity"
        description="Deterministic hashing and Merkle inclusion proofs. Off-chain evidence, minimal public commitments, Hedera consensus receipts when configured."
      >
        <AnchorControls
          configured={providerStatus().configured}
          provider={providerStatus().provider}
          network={hederaStatus().network}
          topicId={hederaStatus().topicId}
          contractId={hederaStatus().contractId}
          explorerBase={hederaStatus().explorerBase}
          anchors={anchors.map((anchor) => ({
            id: anchor.id,
            batchId: anchor.batchId,
            merkleRoot: anchor.merkleRoot,
            provider: anchor.provider,
            network: anchor.network,
            txRef: anchor.txRef,
            status: anchor.status,
            leafCount: anchor.leafCount,
            topicId: anchor.topicId,
            sequenceNumber: anchor.sequenceNumber,
            consensusTimestamp: anchor.consensusTimestamp,
            contractId: anchor.contractId,
            commitments: anchor.commitments,
            createdAt: anchor.createdAt,
          }))}
        />
      </Section>

      <Section
        id="security"
        title="Security and data"
        description="Export and deletion are real operations with immediate effect in this MVP."
      >
        <DataSettings username={user.profile.username} />
      </Section>

      <Section
        id="documentation"
        title="Documentation"
        description="Where the constraints, threat model and activation paths are written down."
      >
        <ul className="divide-y divide-border border-y border-border text-[0.8125rem]">
          {[
            ["Architecture", "/docs#architecture"],
            ["Security and threat model", "/docs#security"],
            ["Scoring method", "/docs#scoring"],
            ["Extension installation", "/docs#extension"],
          ].map(([label, href]) => (
            <li key={href}>
              <Link
                href={href!}
                className="flex items-center justify-between py-2.5 text-muted transition-colors hover:text-foreground"
              >
                {label}
                <ArrowUpRight size={13} />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
