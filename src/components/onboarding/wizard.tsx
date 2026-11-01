"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GitBranch,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn, slugifyUsername } from "@/lib/utils";
import { SKILLS } from "@/lib/ontology";

const SPECIALIZATIONS = [
  "Platform engineering",
  "Backend systems",
  "Frontend systems",
  "Full-stack engineering",
  "DevOps and infrastructure",
  "Software architecture",
  "Data engineering",
];

type Visibility = "private" | "public" | "selective";

interface WizardProps {
  initial: {
    displayName: string;
    username: string;
    headline: string;
    country: string;
    demoMode: boolean;
    githubConfigured: boolean;
  };
}

const STEP_LABELS = ["The premise", "Identity", "Profession", "Observation", "Privacy", "Review"];

export function OnboardingWizard({ initial }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [understood, setUnderstood] = useState(false);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [username, setUsername] = useState(slugifyUsername(initial.username || initial.displayName));
  const [headline, setHeadline] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0]!);
  const [connectGithub, setConnectGithub] = useState(false);
  const [useDemoData, setUseDemoData] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    if (step === 0) return understood;
    if (step === 1) return displayName.trim().length >= 2 && /^[a-z0-9][a-z0-9_-]{2,29}$/.test(username);
    return true;
  }, [step, understood, displayName, username]);

  async function finish() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username,
          headline,
          bio,
          country,
          specialization,
          profession: "software-engineer",
          visibility,
          leaderboardOptIn,
          connectGithub,
          useDemoData,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { next?: string; error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not save onboarding.");
        return;
      }
      router.push(payload?.next ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
      <aside className="hidden lg:block">
        <p className="label">Setup</p>
        <ol className="mt-4 space-y-3">
          {STEP_LABELS.map((label, index) => (
            <li key={label} className="flex items-center gap-2.5 text-[0.8125rem]">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border text-[0.625rem]",
                  index < step
                    ? "border-success/40 bg-success/10 text-success"
                    : index === step
                      ? "border-primary bg-primary text-white"
                      : "border-border-strong text-muted",
                )}
              >
                {index < step ? <Check size={11} /> : index + 1}
              </span>
              <span className={index === step ? "font-medium text-foreground" : "text-muted"}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="max-w-[38rem]">
        <div className="flex items-center gap-2 lg:hidden">
          <span className="num text-xs text-muted">
            {String(step + 1).padStart(2, "0")} / {String(STEP_LABELS.length).padStart(2, "0")}
          </span>
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">{STEP_LABELS[step]}</span>
        </div>

        {step === 0 ? (
          <section className="space-y-6">
            <div>
              <h1 className="display text-[clamp(2.2rem,5vw,3.2rem)]">
                RepuH observes work. It does not examine you.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                There are no quizzes here, no coding challenges, no timed assessments and no
                interviews. RepuH reads attributable professional activity that you explicitly
                authorise, then states what that activity can and cannot support.
              </p>
            </div>

            <ul className="divide-y divide-border border-y border-border">
              {[
                {
                  icon: ShieldCheck,
                  title: "Nothing is collected by default",
                  body: "Observation begins only after a named, revocable consent record exists.",
                },
                {
                  icon: Lock,
                  title: "Private activity stays private",
                  body: "Public profiles are a separate projection, never a filtered view of your records.",
                },
                {
                  icon: Info,
                  title: "Nothing is fabricated",
                  body: "Where evidence is insufficient, the product says proficiency is not established.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3 py-4">
                    <Icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-[0.8125rem] font-medium">{item.title}</p>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{item.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface p-4">
              <input
                type="checkbox"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span className="text-[0.8125rem] leading-relaxed">
                I understand that RepuH observes permitted activity and does not administer
                examinations, quizzes or artificial tests.
              </span>
            </label>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-6">
            <div>
              <h1 className="display text-4xl">How should the identity read?</h1>
              <p className="mt-2 text-sm text-muted">
                Only the display name and username are required. You can change everything later.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" htmlFor="displayName">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (!username || username === slugifyUsername(displayName)) {
                      setUsername(slugifyUsername(event.target.value));
                    }
                  }}
                  maxLength={80}
                />
              </Field>
              <Field label="Username" htmlFor="username" hint="repuh.app/u/…">
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(slugifyUsername(event.target.value))}
                  maxLength={30}
                  aria-invalid={!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username)}
                />
              </Field>
            </div>

            <Field label="Headline" htmlFor="headline" optional hint="120 characters">
              <Input
                id="headline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={120}
                placeholder="Backend engineer — distributed data, Python"
              />
            </Field>

            <Field label="Country" htmlFor="country" optional>
              <Input
                id="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                maxLength={60}
                placeholder="Where you work from"
              />
            </Field>

            <Field label="Biography" htmlFor="bio" optional hint="600 characters">
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={600}
                placeholder="A short factual description. Claims here are not verified."
              />
            </Field>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-6">
            <div>
              <h1 className="display text-4xl">What do you practise?</h1>
              <p className="mt-2 text-sm text-muted">
                Software engineering is the first profession the ontology models. Specialization
                sharpens the fingerprint; it does not change the scoring rules.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-surface p-4">
              <p className="text-[0.8125rem] font-medium">Software engineer</p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                {SKILLS.length} capabilities across programming, backend, frontend, architecture, DevOps and
                collaboration.
              </p>
            </div>

            <Field label="Specialization" htmlFor="specialization">
              <Select
                id="specialization"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
              >
                {SPECIALIZATIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-6">
            <div>
              <h1 className="display text-4xl">Where does the evidence come from?</h1>
              <p className="mt-2 text-sm text-muted">
                GitHub is the primary production integration. Nothing is requested until you
                authorise it, and public repositories are the default.
              </p>
            </div>

            <div className="divide-y divide-border border-y border-border">
              <label className="flex cursor-pointer items-start gap-3 py-4">
                <input
                  type="checkbox"
                  checked={connectGithub}
                  onChange={(event) => {
                    setConnectGithub(event.target.checked);
                    if (event.target.checked) setUseDemoData(false);
                  }}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span>
                  <span className="flex items-center gap-2 text-[0.8125rem] font-medium">
                    <GitBranch size={14} /> Connect GitHub
                  </span>
                  <span className="mt-1 block text-[0.8125rem] leading-relaxed text-muted">
                    Read public repository metadata, pull requests you authored, reviews and issues.
                    Private repositories are never requested by this scope.
                  </span>
                  {connectGithub && !initial.githubConfigured ? (
                    <span className="mt-2 block rounded-sm border border-warning/30 bg-warning/10 px-2 py-1.5 text-[0.6875rem] text-warning">
                      OAuth is not configured in this environment. You will be sent to Integrations,
                      where the status is stated plainly.
                    </span>
                  ) : null}
                </span>
              </label>

              {initial.demoMode ? (
                <label className="flex cursor-pointer items-start gap-3 py-4">
                  <input
                    type="checkbox"
                    checked={useDemoData}
                    onChange={(event) => {
                      setUseDemoData(event.target.checked);
                      if (event.target.checked) setConnectGithub(false);
                    }}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-[0.8125rem] font-medium">
                      Use the labelled development dataset
                    </span>
                    <span className="mt-1 block text-[0.8125rem] leading-relaxed text-muted">
                      Populates representative activity so the product can be explored without
                      credentials. Every item is marked DEMO and is not live GitHub data.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
              <Info size={13} className="mt-0.5 shrink-0" />
              You can skip this and still have a working account. The dashboard will show an honest
              empty state until evidence exists.
            </p>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-6">
            <div>
              <h1 className="display text-4xl">Who can see it?</h1>
              <p className="mt-2 text-sm text-muted">
                Visibility is independent of observation. Making a profile public never makes your
                private activity public.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="label mb-2">Profile visibility</legend>
              {[
                {
                  value: "private" as const,
                  title: "Private",
                  body: "Only you can see the profile. Evidence stays private.",
                },
                {
                  value: "selective" as const,
                  title: "Selectively shared",
                  body: "The profile exists at a stable address, but only items you mark public appear.",
                },
                {
                  value: "public" as const,
                  title: "Public",
                  body: "A scoped projection is readable by anyone. Private records still never appear.",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 transition-colors",
                    visibility === option.value
                      ? "border-primary bg-primary-soft/40"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={visibility === option.value}
                    onChange={() => setVisibility(option.value)}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-[0.8125rem] font-medium">{option.title}</span>
                    <span className="mt-0.5 block text-[0.8125rem] text-muted">{option.body}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface p-3.5">
              <input
                type="checkbox"
                checked={leaderboardOptIn}
                onChange={(event) => setLeaderboardOptIn(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-[0.8125rem] font-medium">
                  Include me in leaderboards
                </span>
                <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted">
                  Separate from profile visibility. Requires a public profile and at least two
                  evidence items per skill. You can withdraw at any time.
                </span>
              </span>
            </label>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-6">
            <div>
              <h1 className="display text-4xl">Review before it is saved.</h1>
              <p className="mt-2 text-sm text-muted">
                Everything here is editable afterwards. Nothing has been sent to an external service
                yet.
              </p>
            </div>

            <dl className="divide-y divide-border border-y border-border text-[0.8125rem]">
              {[
                ["Display name", displayName],
                ["Username", `@${username}`],
                ["Headline", headline || "—"],
                ["Country", country || "—"],
                ["Profession", "Software engineer"],
                ["Specialization", specialization],
                [
                  "Observation",
                  useDemoData
                    ? "Development adapter (labelled demo data)"
                    : connectGithub
                      ? "GitHub — authorisation pending"
                      : "Not connected",
                ],
                ["Visibility", visibility],
                ["Leaderboards", leaderboardOptIn ? "Opted in" : "Not opted in"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="max-w-[60%] text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            {error ? (
              <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0 || pending}
          >
            <ArrowLeft size={15} />
            Back
          </Button>

          {step < STEP_LABELS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep((value) => Math.min(STEP_LABELS.length - 1, value + 1))}
              disabled={!canContinue}
            >
              Continue
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={pending}>
              {pending ? <Loader2 size={15} className="animate-spin" /> : null}
              {pending ? "Saving" : "Enter RepuH"}
              {!pending ? <ArrowRight size={15} /> : null}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
