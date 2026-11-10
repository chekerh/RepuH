"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge, Button, ButtonLink, Field, Input, Select, Textarea } from "@/components/ui";
import { applyTheme } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function ErrorLine({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[0.6875rem] text-danger">
      {children}
    </p>
  );
}

function SuccessLine({ children }: { children: string | null }) {
  if (!children) return null;
  return <p className="text-[0.6875rem] text-accent">{children}</p>;
}

/* ------------------------------------------------------------------ profile */

export function ProfileSettingsForm({
  initial,
}: {
  initial: {
    displayName: string;
    headline: string;
    bio: string;
    country: string;
    specialization: string;
    visibility: "private" | "public" | "selective";
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not save the profile.");
        return;
      }
      setSaved("Profile saved.");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="settings-name">
          <Input
            id="settings-name"
            value={form.displayName}
            maxLength={80}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
          />
        </Field>
        <Field label="Specialization" htmlFor="settings-spec">
          <Input
            id="settings-spec"
            value={form.specialization}
            maxLength={80}
            onChange={(event) => setForm({ ...form, specialization: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Headline" htmlFor="settings-headline">
        <Input
          id="settings-headline"
          value={form.headline}
          maxLength={120}
          onChange={(event) => setForm({ ...form, headline: event.target.value })}
        />
      </Field>
      <Field label="Country" htmlFor="settings-country" optional>
        <Input
          id="settings-country"
          value={form.country}
          maxLength={60}
          onChange={(event) => setForm({ ...form, country: event.target.value })}
        />
      </Field>
      <Field label="Biography" htmlFor="settings-bio" optional hint="600 characters">
        <Textarea
          id="settings-bio"
          value={form.bio}
          maxLength={600}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
        />
      </Field>
      <Field label="Profile visibility" htmlFor="settings-visibility">
        <Select
          id="settings-visibility"
          value={form.visibility}
          onChange={(event) =>
            setForm({ ...form, visibility: event.target.value as typeof form.visibility })
          }
        >
          <option value="private">Private — only you</option>
          <option value="selective">Selectively shared</option>
          <option value="public">Public — anyone with the link</option>
        </Select>
      </Field>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 size={13} className="animate-spin" /> : null}
          {pending ? "Saving" : "Save profile"}
        </Button>
        <SuccessLine>{saved}</SuccessLine>
        <ErrorLine>{error}</ErrorLine>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- preferences */

export function PreferenceSettings({
  initial,
}: {
  initial: {
    theme: "system" | "light" | "dark";
    reducedMotion: boolean;
    notifications: boolean;
    leaderboardOptIn: boolean;
  };
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function update(patch: Partial<typeof preferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setPending(true);
    setError(null);
    setSaved(null);
    if (patch.theme) applyTheme(patch.theme);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Could not save preferences.");
        setPreferences(preferences);
        return;
      }
      setSaved("Preferences saved.");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPreferences(preferences);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Theme" htmlFor="theme">
          <Select
            id="theme"
            value={preferences.theme}
            onChange={(event) => update({ theme: event.target.value as typeof preferences.theme })}
          >
            <option value="system">Follow the operating system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Field>
        <Field label="Language" htmlFor="language">
          <Select id="language" value="en" disabled>
            <option value="en">English</option>
          </Select>
        </Field>
      </div>

      <div className="divide-y divide-border border-y border-border">
        {[
          {
            key: "reducedMotion" as const,
            title: "Reduce motion",
            body: "Stops ambient rotation and long transitions. The operating-system preference is always respected.",
          },
          {
            key: "notifications" as const,
            title: "Product notifications",
            body: "Synchronization results and correction outcomes. No marketing messages exist in this MVP.",
          },
          {
            key: "leaderboardOptIn" as const,
            title: "Leaderboard participation",
            body: "Opt in separately from profile visibility. Requires per-skill evidence and can be withdrawn at any time.",
          },
        ].map((item) => (
          <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 py-3.5">
            <span className="max-w-[52ch]">
              <span className="block text-[0.8125rem] font-medium">{item.title}</span>
              <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted">{item.body}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences[item.key]}
              onChange={(event) => update({ [item.key]: event.target.checked })}
              disabled={pending}
              className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
            />
          </label>
        ))}
      </div>

      <SuccessLine>{saved}</SuccessLine>
      <ErrorLine>{error}</ErrorLine>
    </div>
  );
}

/* --------------------------------------------------------------------- consent */

const PURPOSES = [
  {
    key: "github_observation" as const,
    title: "GitHub observation",
    scope: "public repository metadata, pull requests you authored, reviews and issues",
    body: "Revoking stops new synchronization immediately. Existing evidence is retained until you remove it.",
  },
  {
    key: "browser_observation" as const,
    title: "Browser observation",
    scope: "allowlisted professional documentation domains only",
    body: "Off by default. The extension refuses to send events while this consent is absent or revoked.",
  },
  {
    key: "ai_classification" as const,
    title: "AI-assisted classification",
    scope: "deterministic metadata classification in this deployment",
    body: "This MVP uses a deterministic rule engine, not a hosted model. The consent exists so a future provider can be enabled without pretending it already is.",
  },
];

export function ConsentSettings({
  initial,
}: {
  initial: Record<"github_observation" | "browser_observation" | "ai_classification", boolean>;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(purpose: keyof typeof state, granted: boolean) {
    setPending(purpose);
    setError(null);
    setState((current) => ({ ...current, [purpose]: granted }));
    try {
      const response = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, granted }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Could not record consent.");
        setState((current) => ({ ...current, [purpose]: !granted }));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. The consent change was not recorded.");
      setState((current) => ({ ...current, [purpose]: !granted }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {PURPOSES.map((purpose) => (
          <li key={purpose.key} className="flex items-start justify-between gap-4 py-4">
            <div className="max-w-[56ch]">
              <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-medium">
                {purpose.title}
                {state[purpose.key] ? (
                  <Badge tone="success">Granted</Badge>
                ) : (
                  <Badge>Not granted</Badge>
                )}
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{purpose.body}</p>
              <p className="mt-1 font-mono text-[0.625rem] text-muted">{purpose.scope}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={state[purpose.key] ? "secondary" : "primary"}
              disabled={pending === purpose.key}
              onClick={() => toggle(purpose.key, !state[purpose.key])}
            >
              {pending === purpose.key ? <Loader2 size={12} className="animate-spin" /> : null}
              {state[purpose.key] ? "Revoke" : "Grant"}
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.6875rem] text-muted">
        Every grant and revocation is stored with its scope, version and timestamp in a consent
        record.
      </p>
      <ErrorLine>{error}</ErrorLine>
    </div>
  );
}

/* ---------------------------------------------------------------- data / danger */

export function DataSettings({ username }: { username: string }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/privacy/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not delete the account.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. The account was not deleted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href="/api/privacy/export" size="sm" variant="secondary">
          <Download size={13} />
          Export my data
        </ButtonLink>
        <Button type="button" size="sm" variant="ghost" onClick={signOut}>
          <LogOut size={13} />
          Sign out of this device
        </Button>
      </div>
      <p className="text-[0.6875rem] leading-relaxed text-muted">
        The export is a JSON document containing your profile, preferences, activity, evidence,
        snapshots, anchors and consent history. Provider tokens and session identifiers are excluded.
      </p>

      <div className="border border-danger/30 bg-danger/[0.04] p-4">
        <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-danger">
          <Trash2 size={14} />
          Delete this account
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Immediate and irreversible in this MVP: the account, activity, evidence, snapshots,
          anchors, consent records, sessions and API tokens are removed. Public profile URL{" "}
          <span className="font-mono text-[0.6875rem]">/u/{username}</span> stops resolving.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="w-40">
            <label htmlFor="delete-confirm" className="sr-only">
              Type DELETE to confirm
            </label>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Type DELETE"
              className="h-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={confirmation !== "DELETE" || pending}
            onClick={deleteAccount}
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : null}
            Delete permanently
          </Button>
        </div>
        <ErrorLine>{error}</ErrorLine>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- anchors */

export interface AnchorView {
  id: string;
  batchId: number;
  merkleRoot: string;
  provider: string;
  network: string;
  txRef: string | null;
  status: string;
  leafCount: number;
  topicId: string | null;
  sequenceNumber: number | null;
  consensusTimestamp: string | null;
  contractId: string | null;
  contractBatchId: string | null;
  commitments: string[];
  createdAt: string;
}

export function AnchorControls({
  anchors,
  configured,
  provider,
  network,
  topicId,
  contractId,
  explorerBase,
}: {
  anchors: AnchorView[];
  configured: boolean;
  provider: string;
  network: string;
  topicId: string | null;
  contractId: string | null;
  explorerBase: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<
    Record<string, { ok: boolean; reason: string; chain?: string }>
  >({});
  const [copied, setCopied] = useState<string | null>(null);

  async function createBatch() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/blockchain/anchors", { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create a batch.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. No batch was created.");
    } finally {
      setPending(false);
    }
  }

  async function verify(batchId: number, commitment: string) {
    setError(null);
    try {
      const response = await fetch("/api/blockchain/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId, commitment }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setVerified((current) => ({
          ...current,
          [commitment]: { ok: false, reason: payload?.error?.message ?? "Verification failed." },
        }));
        return;
      }
      const chain = payload?.chain as
        | { checked?: boolean; matches?: boolean; via?: string; reason?: string }
        | undefined;
      const chainLabel = chain
        ? chain.checked
          ? `network re-read via ${chain.via ?? "unknown"}: ${
              chain.matches ? "matches the stored root" : "does not match the stored root"
            }`
          : `network re-read unavailable: ${chain.reason ?? "no reason given"}`
        : "network re-read was not attempted";
      setVerified((current) => ({
        ...current,
        [commitment]: { ok: Boolean(payload.verified), reason: payload.reason, chain: chainLabel },
      }));
    } catch {
      setError("Network error during verification.");
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Clipboard access was refused by the browser.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={createBatch} disabled={pending}>
          {pending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          {pending ? "Creating batch" : "Anchor a new batch"}
        </Button>
        <span className="text-[0.6875rem] text-muted">
          {configured
            ? provider === "hedera-contract"
              ? `Hedera ${network} · EvidenceAnchor contract ${contractId ?? "missing"}`
              : `Hedera ${network} consensus service · topic ${topicId ?? "missing"}`
            : "Hedera is not configured — batches are local commitments, not on-chain."}
        </span>
      </div>

      <ErrorLine>{error}</ErrorLine>

      {anchors.length === 0 ? (
        <p className="border-y border-border py-4 text-[0.8125rem] text-muted">
          No batch has been anchored for this account.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {anchors.map((anchor) => (
            <li key={anchor.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-medium">
                    Batch {anchor.batchId}
                    <Badge
                      tone={
                        anchor.status === "confirmed"
                          ? "success"
                          : anchor.status === "failed"
                            ? "danger"
                            : anchor.status === "local"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {anchor.status === "local" ? "local (not on-chain)" : anchor.status}
                    </Badge>
                    <span className="text-[0.6875rem] font-normal text-muted">
                      {anchor.leafCount} commitments · {anchor.network}
                    </span>
                  </p>
                  <p className="mt-1 break-all font-mono text-[0.625rem] text-muted">
                    root {anchor.merkleRoot}
                  </p>
                  {anchor.txRef ? (
                    <p className="mt-0.5 break-all font-mono text-[0.625rem] text-muted">
                      ref {anchor.txRef}
                    </p>
                  ) : null}
                  {anchor.contractId ? (
                    <p className="mt-0.5 text-[0.625rem] text-muted">
                      EvidenceAnchor contract {anchor.contractId} · batch {anchor.batchId}
                      {anchor.consensusTimestamp ? ` · ${anchor.consensusTimestamp}` : ""}{" "}
                      <a
                        href={`${explorerBase}/contract/${anchor.contractId}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary underline underline-offset-2"
                      >
                        HashScan
                      </a>
                    </p>
                  ) : null}
                  {anchor.contractBatchId ? (
                    <p className="mt-0.5 break-all font-mono text-[0.625rem] text-muted">
                      on-chain batch key {anchor.contractBatchId}
                    </p>
                  ) : null}
                  {anchor.topicId && anchor.sequenceNumber !== null ? (
                    <p className="mt-0.5 text-[0.625rem] text-muted">
                      HCS topic {anchor.topicId} · sequence {anchor.sequenceNumber}
                      {anchor.consensusTimestamp ? ` · ${anchor.consensusTimestamp}` : ""}{" "}
                      <a
                        href={`${explorerBase}/topic/${anchor.topicId}?sequence=${anchor.sequenceNumber}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary underline underline-offset-2"
                      >
                        HashScan
                      </a>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => copy(anchor.merkleRoot)}
                  className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-1 text-[0.6875rem] text-muted hover:text-foreground"
                >
                  {copied === anchor.merkleRoot ? <Check size={11} /> : <Copy size={11} />}
                  {copied === anchor.merkleRoot ? "Copied" : "Copy root"}
                </button>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer list-none text-[0.6875rem] text-muted hover:text-foreground">
                  Inspect inclusion proofs
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {anchor.commitments.map((commitment) => (
                    <li key={commitment} className="flex flex-wrap items-center gap-2">
                      <code className="max-w-full break-all font-mono text-[0.625rem] text-muted">
                        {commitment.slice(0, 40)}…
                      </code>
                      <button
                        type="button"
                        onClick={() => verify(anchor.batchId, commitment)}
                        className="rounded-xs border border-border px-1.5 py-0.5 text-[0.625rem] text-muted hover:text-foreground"
                      >
                        Verify
                      </button>
                      {verified[commitment] ? (
                        <span
                          className={cn(
                            "text-[0.625rem]",
                            verified[commitment]!.ok ? "text-success" : "text-danger",
                          )}
                        >
                          {verified[commitment]!.ok ? "Inclusion verified" : verified[commitment]!.reason}
                        </span>
                      ) : null}
                      {verified[commitment]?.chain ? (
                        <span className="basis-full text-[0.625rem] text-muted">
                          {verified[commitment]!.chain}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-muted">
        A commitment is a deterministic hash of a classified evidence record. It deliberately
        excludes your name, email, skill estimates and project identifiers. An anchor proves the
        record was not altered; it is never presented as proof of proficiency.
      </p>
    </div>
  );
}
