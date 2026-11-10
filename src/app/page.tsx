import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Fingerprint,
  GitPullRequest,
  Layers,
  Lock,
  Network,
  RefreshCw,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { Reveal } from "@/components/scroll-reveal";
import { SiteHeader } from "@/components/site-header";
import { OrbGallery } from "@/shaders/orb-gallery/OrbGallery";
import { ButtonLink } from "@/components/ui";
import { currentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { DEMO_PROFILES } from "@/lib/demo/generator";
import { CATEGORIES, SKILLS } from "@/lib/ontology";
import { hederaOperatorReady } from "@/lib/hedera/config";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    number: "01",
    title: "Connect a source",
    body: "GitHub first. Every scope is listed before anything is read, and you can revoke it later.",
  },
  {
    number: "02",
    title: "Turn work into evidence",
    body: "Pull requests, reviews, commits and documentation are classified against a published ontology. Duplicates are rejected, and volume never turns into proficiency.",
  },
  {
    number: "03",
    title: "Publish what you choose",
    body: "Your fingerprint stays private until you publish it. Every node opens to its evidence, its confidence and its limits.",
  },
];

const FEATURES = [
  {
    icon: Fingerprint,
    title: "A map, not a score",
    body: "Categories, skills and the evidence behind each stay separate. There is no overall number to optimise.",
  },
  {
    icon: RefreshCw,
    title: "Syncs that cannot double-count",
    body: "Incremental sync keeps the map current. Running it twice adds nothing twice.",
  },
  {
    icon: ShieldCheck,
    title: "Proof without disclosure",
    body: "Each record is hashed. A Merkle proof shows it is included without revealing what it says.",
  },
  {
    icon: Network,
    title: "Comparison by capability",
    body: "Filter the network by skill, specialization and period. Followers and account age are not inputs.",
  },
  {
    icon: Lock,
    title: "Private until you publish",
    body: "Observation is visible, revocable and limited to a stated purpose. A public profile runs its own query over its own rows.",
  },
  {
    icon: Layers,
    title: "Anchors, not badges",
    body: "Batch roots go to Hedera. An anchor proves the record is unchanged. It says nothing about proficiency.",
  },
];

export default async function LandingPage() {
  const user = await currentUser();
  const db = getDb();
  const hederaLive = hederaOperatorReady();

  const publicProfiles = (
    db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE visibility = 'public'").get() as {
      count: number;
    }
  ).count;
  const evidenceCount = (
    db.prepare("SELECT COUNT(*) AS count FROM evidence").get() as { count: number }
  ).count;

  return (
    <div className="min-h-dvh">
      <SiteHeader signedIn={Boolean(user?.profile.onboardingComplete)} />

      <main id="main">
        {/* ------------------------------------------------------------- hero */}
        {/* The sticky site header owns 4rem of the viewport, so the hero must
            subtract it. h-dvh alone pushes the pinned copy below the fold. */}
        <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#0b0f16] text-[#edf1f7] lg:block lg:h-[calc(100dvh-4rem)] lg:min-h-[36rem]">
          {/* Mobile stacks the globe above the copy; the overlay only starts at
              lg, where the copy is short enough to sit on the canvas edge. */}
          <div className="relative h-[38dvh] min-h-[15rem] w-full shrink-0 lg:absolute lg:inset-0 lg:h-full">
            <OrbGallery />
          </div>

          {/* Bottom band: copy pinned to the canvas edge, never floating over
              its centre. Content must stay pointer-transparent so the lattice
              keeps its drag unless an interactive element is on top of it. */}
          <div className="pointer-events-none relative z-10 mt-auto lg:absolute lg:inset-x-0 lg:bottom-0">
            <div
              className="absolute inset-x-0 bottom-0 hidden h-80 lg:block"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,15,22,0) 0%, rgba(11,15,22,0.72) 46%, rgba(11,15,22,0.94) 78%, #0b0f16 100%)",
              }}
            />
            <div className="pointer-events-auto relative mx-auto grid w-full max-w-[80rem] gap-6 px-4 pb-8 pt-6 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-14 lg:px-8 lg:pt-28">
              <div>
                <h1
                  className="display rise text-[clamp(2.6rem,6vw,4.6rem)] leading-none text-white"
                  style={{ animationDelay: "40ms" }}
                >
                  <span className="sr-only">RepuH. </span>
                  Every number, traceable.
                </h1>
              </div>
              <div>
                <p className="label rise text-white/55" style={{ animationDelay: "140ms" }}>
                  {SKILLS.length} capabilities · {CATEGORIES.length} categories · no tests
                </p>
                <p
                  className="rise mt-3 max-w-[48ch] text-sm leading-relaxed text-white/75"
                  style={{ animationDelay: "200ms" }}
                >
                  RepuH reads attributable work: commits, reviews, documentation. Each capability it
                  reports comes with the evidence behind it, a confidence level and its limits.
                </p>
                <div
                  className="rise mt-5 flex flex-wrap gap-3"
                  style={{ animationDelay: "260ms" }}
                >
                  {user ? (
                    <ButtonLink href="/dashboard" size="md" variant="secondary">
                      Open dashboard
                    </ButtonLink>
                  ) : (
                    <ButtonLink
                      href="/register"
                      size="md"
                      variant="secondary"
                      className="border border-white/20 bg-white text-[#0b0f16] hover:bg-white/90"
                    >
                      Create your identity
                    </ButtonLink>
                  )}
                  <ButtonLink
                    href="/explore"
                    size="md"
                    variant="ghost"
                    className="border border-white/20 text-white hover:bg-white/10"
                  >
                    Explore the network
                  </ButtonLink>
                </div>
                <ul
                  className="rise mt-6 flex flex-wrap gap-x-6 gap-y-2"
                  style={{ animationDelay: "320ms" }}
                >
                  <li className="label text-white/55">Ed25519-signed certificates</li>
                  <li className="label text-white/55">Merkle inclusion proofs</li>
                  <li className="label text-white/55">
                    Hedera timestamps{hederaLive ? "" : " · not configured here"}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8">
          <div className="h-px w-full bg-border" />
          <Reveal as="div">
            <p className="display max-w-[52rem] py-10 text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.25] text-foreground/90">
              RepuH does not ask you to prove yourself in a browser tab. It reads the work you already
              published, reports what that work supports, and stops where the evidence stops.
            </p>
          </Reveal>
          <div className="h-px w-full bg-border" />
        </div>

        {/* -------------------------------------------------------- how it works */}
        <section id="how" className="mx-auto w-full max-w-[80rem] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr]">
            <div>
              <h2 className="display text-[clamp(2rem,4vw,2.9rem)]">How it works</h2>
              <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-muted">
                Three steps, in order. Each one is reversible, and nothing is read until you have
                seen what it covers.
              </p>
            </div>
            <Reveal stagger={0.09} className="grid gap-0 border-t border-border sm:grid-cols-3 sm:gap-6">
              {STEPS.map((step) => (
                <li key={step.number} className="border-b border-border py-6 sm:border-b-0 sm:pt-6">
                  <span className="num text-xs text-muted">{step.number}</span>
                  <h3 className="mt-3 text-[0.9375rem] font-medium">{step.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- product set */}
        <section id="product" className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-[80rem] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.6fr]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <h2 className="display text-[clamp(2rem,4vw,2.9rem)]">What the product does</h2>
                <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted">
                  Six things it does. One rule runs through all of them: nothing appears as fact
                  unless the evidence supports it.
                </p>
                <Link
                  href="/docs"
                  className="mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary hover:underline"
                >
                  Read the method
                  <ArrowUpRight size={14} />
                </Link>
              </div>

              <Reveal as="div" className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
                <dl className="contents">
                  {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title} className="border-t border-border py-6">
                        <dt className="flex items-center gap-2 text-[0.9375rem] font-medium">
                          <Icon size={16} strokeWidth={1.75} className="text-primary" />
                          {feature.title}
                        </dt>
                        <dd className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
                          {feature.body}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- principles */}
        <section id="principles" className="border-t border-border bg-[#0b1220] text-white">
          <div className="mx-auto w-full max-w-[80rem] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <h2 className="display max-w-[22ch] text-[clamp(2rem,4vw,2.9rem)] text-white">
                  Personal activity is private by default.
                </h2>
                <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-white/60">
                  Observation is visible, limited to a stated purpose and revocable at any moment. A
                  public profile is built from its own scoped query, never from filtering your
                  private records.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink
                    href="/register"
                    size="md"
                    className="border border-white/15 bg-white text-[#0b1220] hover:bg-white/90"
                  >
                    Create your identity
                  </ButtonLink>
                  <ButtonLink
                    href="/privacy"
                    size="md"
                    variant="ghost"
                    className="border border-white/15 text-white hover:bg-white/10"
                  >
                    Read the privacy model
                  </ButtonLink>
                </div>
              </div>

              <Reveal as="div">
                <ul className="space-y-0 border-t border-white/15">
                  {[
                    {
                      title: "Consent is recorded",
                      body: "Every grant and revocation keeps its scope, version and timestamp.",
                    },
                    {
                      title: "Confidence sits beside the estimate",
                      body: "They are reported separately, every time.",
                    },
                    {
                      title: "Estimates can be reconstructed",
                      body: "Algorithm version, inputs and recency stay on record, so an old number can still be explained.",
                    },
                    {
                      title: "Demo data says so",
                      body: "Fixtures carry a DEMO badge and never mix into a real account.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="border-b border-white/15 py-5">
                      <p className="text-[0.9375rem] font-medium text-white/90">{item.title}</p>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-white/50">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- stats */}
        <Reveal className="mx-auto w-full max-w-[80rem] px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 border-y border-border py-6 sm:grid-cols-4">
            <div>
              <p className="num text-2xl">{publicProfiles}</p>
              <p className="mt-1 text-xs text-muted">public profiles</p>
            </div>
            <div>
              <p className="num text-2xl">{evidenceCount}</p>
              <p className="mt-1 text-xs text-muted">evidence records</p>
            </div>
            <div>
              <p className="num text-2xl">{SKILLS.length}</p>
              <p className="mt-1 text-xs text-muted">capabilities modelled</p>
            </div>
            <div>
              <p className="num text-2xl">0</p>
              <p className="mt-1 text-xs text-muted">platform-administered tests</p>
            </div>
          </div>
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
            Counts are read from this deployment. The {DEMO_PROFILES.length} seeded examples are
            marked DEMO and never presented as live users.
          </p>
        </Reveal>

        {/* -------------------------------------------------------------- closing */}
        <section className="border-t border-border">
          <Reveal
            as="div"
            className="mx-auto flex w-full max-w-[80rem] flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:px-8"
          >
            <div>
              <h2 className="display text-[clamp(2rem,4vw,3rem)]">
                Start with what you have already built.
              </h2>
              <p className="mt-3 max-w-[44ch] text-sm text-muted">
                Connect GitHub and let the map fill in, or read a few public profiles first and see
                how an evidence-backed one reads.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/register" size="lg">
                Create your identity
                <ArrowRight size={16} />
              </ButtonLink>
              <ButtonLink href="/explore" size="lg" variant="secondary">
                Explore the network
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-[80rem] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold">
              Repu<span className="text-primary">H</span>
            </p>
            <p className="mt-2 max-w-[34ch] text-xs leading-relaxed text-muted">
              A record of demonstrated capability, built from published work and checked against its
              evidence.
            </p>
            <p className="mt-4 text-[0.6875rem] text-muted">
              MVP · not a production deployment. Read the{" "}
              <Link href="/docs" className="underline underline-offset-2">
                limitations
              </Link>
              .
            </p>
          </div>

          <nav aria-label="Product" className="text-[0.8125rem]">
            <p className="label mb-3">Product</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/explore" className="hover:text-foreground">Explore the network</Link></li>
              <li><Link href="/leaderboards" className="hover:text-foreground">Leaderboards</Link></li>
              <li><Link href="/register" className="hover:text-foreground">Create your identity</Link></li>
              <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
            </ul>
          </nav>

          <nav aria-label="Company" className="text-[0.8125rem]">
            <p className="label mb-3">Company</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              <li>
                <a
                  href="https://github.com/chekerh/RepuH"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  GitHub repository
                  <ArrowUpRight size={12} />
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-2 px-4 py-5 text-[0.6875rem] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} RepuH. No token, no paid reputation, no purchased rank.</p>
            <p className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <GitPullRequest size={12} /> GitHub-first
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Code2 size={12} /> Software engineering
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Waypoints size={12} /> Evidence-first
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
