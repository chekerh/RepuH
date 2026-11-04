/**
 * Development adapter dataset (REPUH-GH-005).
 *
 * Everything produced here is marked `isDemo` and is surfaced in the UI with a
 * DEMO label. It exists so the product can be explored without GitHub
 * credentials; it must never be presented as live external data.
 */

import type { NormalizedEvent } from "@/lib/evidence/classify";

export interface DemoProject {
  name: string;
  language: string;
  framework?: string;
  files: string[];
  topics?: string[];
}

// Shared by the seeder and the sign-in screen so the demo is reproducible
// without exposing anything beyond labelled development data.
export const DEMO_PASSWORD = "repuh-demo-password";

export interface DemoProfileSpec {
  key: string;
  email: string;
  displayName: string;
  username: string;
  headline: string;
  bio: string;
  country: string;
  specialization: string;
  visibility: "private" | "public" | "selective";
  projects: DemoProject[];
}

export const DEMO_PROFILES: DemoProfileSpec[] = [
  {
    key: "aisha",
    email: "aisha.rahman@demo.repuh.local",
    displayName: "Aisha Rahman",
    username: "aisha-dev",
    headline: "Platform engineer — TypeScript, Rust, developer tooling",
    bio: "Builds the layer other engineers stand on. Mostly TypeScript and Rust, mostly in public.",
    country: "United Kingdom",
    specialization: "Platform engineering",
    visibility: "public",
    projects: [
      {
        name: "orbit-api",
        language: "TypeScript",
        framework: "nextjs",
        files: [
          "src/app/api/evidence/route.ts",
          "src/lib/evidence/classify.ts",
          "src/lib/db/schema.ts",
          "openapi.yaml",
          "src/auth/session.ts",
        ],
        topics: ["api", "typescript"],
      },
      {
        name: "signal-ui",
        language: "TypeScript",
        framework: "react",
        files: [
          "src/components/CapabilityMap.tsx",
          "src/components/EvidenceDrawer.tsx",
          "src/styles/tokens.css",
          "src/components/a11y/SkipLink.tsx",
        ],
        topics: ["react", "design-system"],
      },
      {
        name: "merkle-rs",
        language: "Rust",
        files: ["src/lib.rs", "src/merkle.rs", "benches/proof.rs", "docs/design.md"],
      },
    ],
  },
  {
    key: "marcus",
    email: "marcus.oyelaran@demo.repuh.local",
    displayName: "Marcus Oyelaran",
    username: "moyelaran",
    headline: "Backend engineer — Python, Java, distributed data",
    bio: "Works on services where correctness matters more than ceremony.",
    country: "Nigeria",
    specialization: "Backend systems",
    visibility: "public",
    projects: [
      {
        name: "ledger-core",
        language: "Java",
        files: [
          "src/main/java/LedgerService.java",
          "src/main/java/ReconciliationJob.java",
          "migrations/0004_ledger.sql",
          "docs/adr/0002-idempotency.md",
        ],
        topics: ["backend", "ledger"],
      },
      {
        name: "ingest-pipeline",
        language: "Python",
        files: [
          "app/main.py",
          "app/workers/normalize.py",
          "infra/Dockerfile",
          ".github/workflows/ci.yml",
          "docs/architecture.md",
        ],
      },
      {
        name: "schema-tools",
        language: "SQL",
        files: ["migrations/0001_init.sql", "migrations/0002_indexes.sql", "docs/schema.md"],
      },
    ],
  },
  {
    key: "lena",
    email: "lena.fischer@demo.repuh.local",
    displayName: "Lena Fischer",
    username: "lena-f",
    headline: "Frontend engineer — React, accessibility, design systems",
    bio: "Interfaces that work for everyone, including the people who use keyboards.",
    country: "Germany",
    specialization: "Frontend systems",
    visibility: "public",
    projects: [
      {
        name: "atlas-web",
        language: "TypeScript",
        framework: "nextjs",
        files: [
          "src/app/explore/page.tsx",
          "src/components/FilterBar.tsx",
          "src/components/a11y/Dialog.tsx",
          "src/styles/globals.css",
        ],
        topics: ["nextjs", "accessibility"],
      },
      {
        name: "atlas-ds",
        language: "TypeScript",
        framework: "react",
        files: [
          "packages/tokens/index.css",
          "packages/button/Button.tsx",
          "packages/dialog/Dialog.tsx",
          "docs/usage.md",
        ],
        topics: ["react", "design-system"],
      },
    ],
  },
  {
    key: "diego",
    email: "diego.salas@demo.repuh.local",
    displayName: "Diego Salas",
    username: "dsalas",
    headline: "Infrastructure engineer — containers, CI, observability",
    bio: "Makes deploys boring on purpose.",
    country: "Chile",
    specialization: "DevOps and platform",
    visibility: "public",
    projects: [
      {
        name: "infra-kit",
        language: "HCL",
        files: [
          "terraform/main.tf",
          "terraform/modules/network/main.tf",
          "Dockerfile",
          ".github/workflows/release.yml",
          "k8s/deployment.yaml",
        ],
      },
      {
        name: "observe-stack",
        language: "TypeScript",
        files: ["src/telemetry/otel.ts", "src/monitoring/alerts.ts", "docs/runbook.md"],
      },
    ],
  },
  {
    key: "priya",
    email: "priya.nair@demo.repuh.local",
    displayName: "Priya Nair",
    username: "priya-builds",
    headline: "Full-stack engineer — APIs, data, product surfaces",
    bio: "Ships end to end and writes down why.",
    country: "India",
    specialization: "Full-stack engineering",
    visibility: "public",
    projects: [
      {
        name: "proof-market",
        language: "TypeScript",
        framework: "nextjs",
        files: [
          "src/app/api/anchors/route.ts",
          "src/lib/merkle.ts",
          "src/components/ProofViewer.tsx",
          "docs/adr/0001-anchoring.md",
        ],
      },
      {
        name: "proof-mobile-api",
        language: "Python",
        files: ["app/routes/verify.py", "app/models/commitment.py", "openapi.json"],
      },
    ],
  },
];

/* ------------------------------------------------------------------ helpers */

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgo(now: Date, days: number, hours = 9): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hours, Math.floor((days * 37) % 60), 0, 0);
  return date.toISOString();
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

const PR_TITLES = [
  "Tighten evidence attribution boundaries",
  "Add retry with backoff to the sync worker",
  "Split capability aggregation out of the page loader",
  "Replace ad-hoc date maths with a single clock",
  "Make the skill drawer keyboard operable",
  "Cache ontology lookups per request",
  "Handle partial provider failures without dropping a batch",
  "Document the scoring denominator",
  "Reduce layout shift on the fingerprint view",
  "Add idempotency keys to ingestion",
  "Correct confidence for single-source evidence",
  "Introduce schema validation at the API edge",
];

const REVIEW_NOTES = [
  "Query is unbounded; please add a limit before this ships.",
  "This duplicates the mapping already in the ontology — can we reuse it?",
  "Nice catch on the stale session. One nit: the error message leaks the internal id.",
  "I would rather see this as a pure function so we can test the boundary.",
  "The retry loop never backs off on 429. Blocking until that is handled.",
  "Approving; the migration is reversible and the index is justified.",
];

const ISSUE_TITLES = [
  "Fingerprint shows a score for a skill with one commit",
  "Sync re-imports the same pull request after a retry",
  "Dark theme loses contrast on secondary labels",
  "Extension queue loses events when the worker restarts",
  "Evidence drawer overflows at 360px",
  "Leaderboard includes an account with a private profile",
];

export function buildDemoEvents(spec: DemoProfileSpec, now = new Date()): NormalizedEvent[] {
  const random = mulberry32(hashKey(spec.key));
  const events: NormalizedEvent[] = [];
  let sequence = 0;
  const id = (kind: string) => `${spec.key}-${kind}-${(sequence += 1)}`;

  spec.projects.forEach((project, projectIndex) => {
    const baseDays = 230 - projectIndex * 22;

    events.push({
      source: "github",
      eventType: "repository_created",
      externalId: id("repo"),
      occurredAt: daysAgo(now, baseDays + 34),
      projectReference: `${spec.username}/${project.name}`,
      attribution: "self",
      isDemo: true,
      payload: {
        repository: `${spec.username}/${project.name}`,
        title: `Initial commit — ${project.name}`,
        language: project.language,
        languages: [project.language],
        framework: project.framework,
        topics: project.topics ?? [],
        files: project.files.slice(0, 2),
      },
    });

    const prCount = 5 + Math.floor(random() * 4);
    for (let index = 0; index < prCount; index += 1) {
      const offsets = 6 + index * 11 + Math.floor(random() * 5);
      const age = Math.max(4, baseDays - offsets);
      const files = project.files.slice(0, 1 + Math.floor(random() * project.files.length));
      events.push({
        source: "github",
        eventType: "pull_request_merged",
        externalId: id("pr"),
        occurredAt: daysAgo(now, age, 10 + index),
        projectReference: `${spec.username}/${project.name}`,
        attribution: "self",
        isDemo: true,
        payload: {
          repository: `${spec.username}/${project.name}`,
          title: pick(PR_TITLES, random),
          language: project.language,
          languages: [project.language],
          framework: project.framework,
          topics: project.topics ?? [],
          files,
          additions: 40 + Math.floor(random() * 420),
          deletions: 10 + Math.floor(random() * 160),
        },
      });
    }

    const reviewCount = 2 + Math.floor(random() * 3);
    for (let index = 0; index < reviewCount; index += 1) {
      const age = Math.max(3, baseDays - 18 - index * 26);
      events.push({
        source: "github",
        eventType: "code_review_submitted",
        externalId: id("rev"),
        occurredAt: daysAgo(now, age, 14),
        projectReference: `${spec.username}/${project.name}`,
        attribution: "self",
        isDemo: true,
        payload: {
          repository: `${spec.username}/${project.name}`,
          title: `Review on ${project.name}`,
          language: project.language,
          languages: [project.language],
          framework: project.framework,
          files: project.files.slice(0, 1),
          reviewComments: 1 + Math.floor(random() * 4),
          bodyLength: 120 + Math.floor(random() * 700),
        },
      });
    }

    const commitCount = 4 + Math.floor(random() * 3);
    for (let index = 0; index < commitCount; index += 1) {
      const age = Math.max(2, baseDays - 4 - index * 17);
      events.push({
        source: "github",
        eventType: "commit_activity",
        externalId: id("commit"),
        occurredAt: daysAgo(now, age, 11),
        projectReference: `${spec.username}/${project.name}`,
        attribution: "self",
        isDemo: true,
        payload: {
          repository: `${spec.username}/${project.name}`,
          title: `Commit series — ${project.name}`,
          language: project.language,
          languages: [project.language],
          framework: project.framework,
          files: project.files.slice(0, 2),
          commitCount: 2 + Math.floor(random() * 5),
        },
      });
    }

    if (random() > 0.35) {
      events.push({
        source: "github",
        eventType: "documentation_contributed",
        externalId: id("doc"),
        occurredAt: daysAgo(now, Math.max(5, baseDays - 40), 16),
        projectReference: `${spec.username}/${project.name}`,
        attribution: "self",
        isDemo: true,
        payload: {
          repository: `${spec.username}/${project.name}`,
          title: `Document the ${project.name} architecture`,
          language: project.language,
          languages: [project.language],
          files: ["docs/architecture.md", "docs/adr/0001-boundaries.md"],
        },
      });
    }

    if (random() > 0.4) {
      events.push({
        source: "github",
        eventType: "issue_resolved",
        externalId: id("issue"),
        occurredAt: daysAgo(now, Math.max(4, baseDays - 55), 13),
        projectReference: `${spec.username}/${project.name}`,
        attribution: "self",
        isDemo: true,
        payload: {
          repository: `${spec.username}/${project.name}`,
          title: pick(ISSUE_TITLES, random),
          language: project.language,
          languages: [project.language],
          files: project.files.slice(0, 1),
        },
      });
    }

    if (random() > 0.5) {
      events.push({
        source: "github",
        eventType: "release_published",
        externalId: id("release"),
        occurredAt: daysAgo(now, Math.max(3, baseDays - 70), 17),
        projectReference: `${spec.username}/${project.name}`,
        attribution: "self",
        isDemo: true,
        payload: {
          repository: `${spec.username}/${project.name}`,
          title: `Release v0.${projectIndex + 2}.0`,
          version: `v0.${projectIndex + 2}.0`,
          language: project.language,
          languages: [project.language],
          files: [".github/workflows/release.yml"],
        },
      });
    }
  });

  return events.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}

function hashKey(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** The dataset offered to a signed-in account that enables the dev adapter. */
export function selfDemoSpec(input: {
  username: string;
  displayName: string;
  email: string;
  specialization: string;
}): DemoProfileSpec {
  return {
    key: `self-${input.username}`,
    email: input.email,
    displayName: input.displayName,
    username: input.username,
    headline: "Software engineer — TypeScript, APIs, evidence systems",
    bio: "Demonstration dataset. Not live GitHub activity.",
    country: "",
    specialization: input.specialization || "Full-stack engineering",
    visibility: "private",
    projects: [
      {
        name: "repuh-demo-work",
        language: "TypeScript",
        framework: "nextjs",
        files: [
          "src/app/api/evidence/route.ts",
          "src/lib/scoring/engine.ts",
          "src/lib/integrity/merkle.ts",
          "src/components/Fingerprint.tsx",
          "docs/architecture.md",
          "migrations/0003_evidence.sql",
        ],
        topics: ["typescript", "nextjs"],
      },
      {
        name: "demo-service",
        language: "Python",
        files: ["app/main.py", "app/workers/sync.py", "Dockerfile", ".github/workflows/ci.yml"],
      },
      {
        name: "demo-ui",
        language: "TypeScript",
        framework: "react",
        files: [
          "src/components/EvidenceList.tsx",
          "src/components/a11y/Dialog.tsx",
          "src/styles/tokens.css",
          "src/state/store.ts",
        ],
        topics: ["react", "accessibility"],
      },
    ],
  };
}
