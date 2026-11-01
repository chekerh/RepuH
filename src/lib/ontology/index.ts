/**
 * The skill ontology.
 *
 * Every capability in RepuH is a stable entity with a category, a definition,
 * the evidence signals that can honestly speak to it, and the limitations of
 * that evidence. The ontology is data, not behaviour: scoring, classification
 * and presentation all read from here so that adding a profession later does
 * not require touching the intelligence engine.
 */

export const ONTOLOGY_VERSION = "1.0.0";

export type SkillCategoryId =
  | "programming"
  | "backend"
  | "frontend"
  | "architecture"
  | "devops"
  | "collaboration";

export interface SkillCategory {
  id: SkillCategoryId;
  name: string;
  summary: string;
}

/**
 * The kinds of evidence the MVP can attribute. Each carries a different claim:
 * a commit is activity, a review is participation, a merged pull request is a
 * completed contribution. They are deliberately not interchangeable.
 */
export type EvidenceSignal =
  | "merged_pull_request"
  | "code_review"
  | "commit_series"
  | "issue_resolution"
  | "documentation"
  | "repository"
  | "release"
  | "observation";

export interface SignalDefinition {
  id: EvidenceSignal;
  label: string;
  /** What this signal can support. Used verbatim in rationale text. */
  claim: string;
  /** Base weight before recency and quality. Kept deliberately small. */
  baseWeight: number;
  /** Independent corroboration credit. */
  corroboration: number;
}

export const SIGNALS: Record<EvidenceSignal, SignalDefinition> = {
  merged_pull_request: {
    id: "merged_pull_request",
    label: "Merged pull request",
    claim: "a completed, reviewed contribution to a shared codebase",
    baseWeight: 1,
    corroboration: 0.9,
  },
  code_review: {
    id: "code_review",
    label: "Code review",
    claim: "participation in review of someone else's work",
    baseWeight: 0.6,
    corroboration: 0.8,
  },
  commit_series: {
    id: "commit_series",
    label: "Commit series",
    claim: "sustained development activity in a project",
    baseWeight: 0.42,
    corroboration: 0.55,
  },
  issue_resolution: {
    id: "issue_resolution",
    label: "Issue resolution",
    claim: "diagnosis and resolution of a reported problem",
    baseWeight: 0.4,
    corroboration: 0.6,
  },
  documentation: {
    id: "documentation",
    label: "Documentation contribution",
    claim: "written explanation of a system or decision",
    baseWeight: 0.5,
    corroboration: 0.7,
  },
  repository: {
    id: "repository",
    label: "Repository",
    claim: "an attributable body of work exists",
    baseWeight: 0.18,
    corroboration: 0.4,
  },
  release: {
    id: "release",
    label: "Release",
    claim: "a shipped version of a system",
    baseWeight: 0.55,
    corroboration: 0.85,
  },
  observation: {
    id: "observation",
    label: "Observed session",
    claim: "permitted browsing activity in a declared tool",
    baseWeight: 0.12,
    corroboration: 0.25,
  },
};

export interface Skill {
  id: string;
  name: string;
  categoryId: SkillCategoryId;
  /** One sentence a person could read in a skill drawer. */
  definition: string;
  /** Signals that may credibly support this skill. */
  signals: EvidenceSignal[];
  /** Stated plainly wherever the skill is shown. */
  limitations: string;
  related: string[];
}

export const CATEGORIES: SkillCategory[] = [
  {
    id: "programming",
    name: "Programming",
    summary: "Languages exercised in attributable, working code.",
  },
  {
    id: "backend",
    name: "Backend engineering",
    summary: "Systems, data and interfaces that run server-side.",
  },
  {
    id: "frontend",
    name: "Frontend engineering",
    summary: "Interfaces people operate, in the browser.",
  },
  {
    id: "architecture",
    name: "Software architecture",
    summary: "Structure, trade-offs and decisions made durable.",
  },
  {
    id: "devops",
    name: "DevOps and infrastructure",
    summary: "Building, shipping and observing running systems.",
  },
  {
    id: "collaboration",
    name: "Collaboration",
    summary: "Working with other people through artifacts.",
  },
];

export const SKILLS: Skill[] = [
  // Programming -------------------------------------------------------------
  {
    id: "javascript",
    name: "JavaScript",
    categoryId: "programming",
    definition:
      "Writing and maintaining JavaScript in a shared codebase, including its module, async and runtime behaviour.",
    signals: ["merged_pull_request", "commit_series", "code_review"],
    limitations:
      "Language detection from repository metadata only; a merged change in a polyglot repository may be misattributed.",
    related: ["typescript", "react", "ui-implementation"],
  },
  {
    id: "typescript",
    name: "TypeScript",
    categoryId: "programming",
    definition:
      "Applying TypeScript's type system to make interfaces and data shapes explicit and safe.",
    signals: ["merged_pull_request", "commit_series", "code_review"],
    limitations:
      "Cannot distinguish a thin type annotation from rigorous modelling without reading the change itself.",
    related: ["javascript", "react", "nextjs"],
  },
  {
    id: "python",
    name: "Python",
    categoryId: "programming",
    definition:
      "Writing Python for automation, services or analysis with attention to packaging and runtime behaviour.",
    signals: ["merged_pull_request", "commit_series", "documentation"],
    limitations: "Notebook-only work is under-represented in commit metadata.",
    related: ["api-development", "infrastructure-automation"],
  },
  {
    id: "java",
    name: "Java",
    categoryId: "programming",
    definition:
      "Building and maintaining Java services, including their build, dependency and concurrency characteristics.",
    signals: ["merged_pull_request", "commit_series", "code_review"],
    limitations: "Generated or vendored code can inflate apparent activity.",
    related: ["backend-architecture", "distributed-systems"],
  },
  {
    id: "rust",
    name: "Rust",
    categoryId: "programming",
    definition:
      "Writing Rust where ownership, lifetimes and zero-cost abstractions shape the design.",
    signals: ["merged_pull_request", "commit_series", "code_review"],
    limitations: "Small contributions to foundational crates are easily over-read.",
    related: ["performance-optimization", "system-design"],
  },
  {
    id: "cpp",
    name: "C++",
    categoryId: "programming",
    definition:
      "Writing C++ with explicit control over memory, layout and performance.",
    signals: ["merged_pull_request", "commit_series", "code_review"],
    limitations: "Headers and build files can dominate diffs without evidencing design work.",
    related: ["performance-optimization", "distributed-systems"],
  },
  {
    id: "sql",
    name: "SQL",
    categoryId: "programming",
    definition:
      "Querying and modelling relational data, including indexes, transactions and constraint design.",
    signals: ["merged_pull_request", "documentation", "commit_series"],
    limitations:
      "Query text is only observable when explicitly authorised; the MVP infers SQL from migration and schema files.",
    related: ["database-engineering", "performance-optimization"],
  },

  // Backend -----------------------------------------------------------------
  {
    id: "api-development",
    name: "API development",
    categoryId: "backend",
    definition:
      "Designing and implementing interfaces between systems, including contracts, validation and error behaviour.",
    signals: ["merged_pull_request", "documentation", "issue_resolution"],
    limitations:
      "Interface breadth is not quality; a large surface can be inconsistent.",
    related: ["backend-architecture", "authentication", "documentation"],
  },
  {
    id: "database-engineering",
    name: "Database engineering",
    categoryId: "backend",
    definition:
      "Designing schemas, migrations and access patterns that stay correct as data grows.",
    signals: ["merged_pull_request", "documentation", "issue_resolution"],
    limitations:
      "Schema changes are evidence of change, not of correctness under load.",
    related: ["sql", "performance-optimization", "system-design"],
  },
  {
    id: "authentication",
    name: "Authentication",
    categoryId: "backend",
    definition:
      "Implementing identity, session and authorization flows with correct trust boundaries.",
    signals: ["merged_pull_request", "documentation", "code_review"],
    limitations:
      "Security-sensitive work is often private and therefore invisible here.",
    related: ["api-development", "backend-architecture"],
  },
  {
    id: "distributed-systems",
    name: "Distributed systems",
    categoryId: "backend",
    definition:
      "Reasoning about partial failure, retries, ordering and consistency across service boundaries.",
    signals: ["merged_pull_request", "documentation", "code_review"],
    limitations:
      "Distributed competence is rarely provable from public artifacts alone; confidence stays capped.",
    related: ["system-design", "backend-architecture", "scalability"],
  },
  {
    id: "backend-architecture",
    name: "Backend architecture",
    categoryId: "backend",
    definition:
      "Choosing module boundaries, data ownership and execution models for server-side systems.",
    signals: ["merged_pull_request", "documentation", "code_review"],
    limitations: "Architecture is frequently decided in conversation, which is not observed.",
    related: ["system-design", "api-development", "design-patterns"],
  },
  {
    id: "performance-optimization",
    name: "Performance optimization",
    categoryId: "backend",
    definition:
      "Identifying and removing measured bottlenecks rather than assumed ones.",
    signals: ["merged_pull_request", "issue_resolution", "documentation"],
    limitations:
      "The MVP does not read benchmarks unless an evidence item carries them explicitly.",
    related: ["scalability", "database-engineering"],
  },

  // Frontend ----------------------------------------------------------------
  {
    id: "react",
    name: "React",
    categoryId: "frontend",
    definition:
      "Building interfaces with React's component, state and rendering model.",
    signals: ["merged_pull_request", "commit_series", "code_review"],
    limitations:
      "Component files imported from a design system can inflate the signal.",
    related: ["typescript", "nextjs", "state-management"],
  },
  {
    id: "nextjs",
    name: "Next.js",
    categoryId: "frontend",
    definition:
      "Using Next.js routing, rendering and data boundaries deliberately across server and client.",
    signals: ["merged_pull_request", "commit_series", "documentation"],
    limitations:
      "A Next.js repository does not imply competent use of its server model.",
    related: ["react", "ui-implementation", "deployment"],
  },
  {
    id: "ui-implementation",
    name: "UI implementation",
    categoryId: "frontend",
    definition:
      "Translating an intended interface into working, resilient markup and style.",
    signals: ["merged_pull_request", "code_review", "documentation"],
    limitations:
      "Visual quality is not assessed; only that interface work is attributable.",
    related: ["react", "responsive-development", "accessibility"],
  },
  {
    id: "responsive-development",
    name: "Responsive development",
    categoryId: "frontend",
    definition:
      "Making an interface usable across real device widths without overflow or loss of meaning.",
    signals: ["merged_pull_request", "code_review", "issue_resolution"],
    limitations:
      "Breakpoints in code are intent; they are not a record of tested devices.",
    related: ["ui-implementation", "accessibility"],
  },
  {
    id: "accessibility",
    name: "Accessibility",
    categoryId: "frontend",
    definition:
      "Building interfaces operable by keyboard, assistive technology and at sufficient contrast.",
    signals: ["merged_pull_request", "issue_resolution", "documentation"],
    limitations:
      "The MVP does not audit a user's product; it observes related work only.",
    related: ["ui-implementation", "responsive-development"],
  },
  {
    id: "state-management",
    name: "State management",
    categoryId: "frontend",
    definition:
      "Keeping client state coherent, minimal and correct across asynchronous updates.",
    signals: ["merged_pull_request", "code_review", "documentation"],
    limitations:
      "State bugs are often fixed silently, leaving little attributable trace.",
    related: ["react", "ui-implementation"],
  },

  // Architecture ------------------------------------------------------------
  {
    id: "system-design",
    name: "System design",
    categoryId: "architecture",
    definition:
      "Defining components, responsibilities and data flow for a system before it is built.",
    signals: ["documentation", "merged_pull_request", "code_review"],
    limitations:
      "Design documents are only visible when a repository contains them.",
    related: ["backend-architecture", "scalability", "architecture-documentation"],
  },
  {
    id: "design-patterns",
    name: "Design patterns",
    categoryId: "architecture",
    definition:
      "Applying known structural solutions where they reduce complexity rather than add it.",
    signals: ["merged_pull_request", "code_review"],
    limitations:
      "Pattern use is inferred from changed paths and cannot read intent directly.",
    related: ["backend-architecture", "system-design"],
  },
  {
    id: "scalability",
    name: "Scalability",
    categoryId: "architecture",
    definition:
      "Designing for growth in load, data volume and team size without breaking correctness.",
    signals: ["merged_pull_request", "documentation", "code_review"],
    limitations:
      "Claims of scale require load evidence the MVP does not collect.",
    related: ["system-design", "distributed-systems", "performance-optimization"],
  },
  {
    id: "technical-decision-making",
    name: "Technical decision-making",
    categoryId: "architecture",
    definition:
      "Recording a decision with its context, alternatives and consequences.",
    signals: ["documentation", "merged_pull_request"],
    limitations:
      "Decision records are rare; absence of evidence is not evidence of absence.",
    related: ["architecture-documentation", "system-design"],
  },
  {
    id: "architecture-documentation",
    name: "Architecture documentation",
    categoryId: "architecture",
    definition:
      "Writing documentation that lets another engineer operate the system without asking.",
    signals: ["documentation", "merged_pull_request"],
    limitations:
      "Word count is not clarity; the MVP cannot grade prose quality.",
    related: ["documentation", "technical-communication", "technical-decision-making"],
  },

  // DevOps ------------------------------------------------------------------
  {
    id: "docker",
    name: "Docker",
    categoryId: "devops",
    definition:
      "Packaging services into reproducible container images with explicit runtime contracts.",
    signals: ["merged_pull_request", "documentation", "release"],
    limitations:
      "A Dockerfile's presence does not establish that the image is minimal or secure.",
    related: ["deployment", "ci-cd", "cloud-infrastructure"],
  },
  {
    id: "ci-cd",
    name: "CI/CD",
    categoryId: "devops",
    definition:
      "Automating verification and delivery so changes reach users predictably.",
    signals: ["merged_pull_request", "release", "documentation"],
    limitations:
      "Pipeline edits are risky work that may not reflect ownership of the pipeline.",
    related: ["deployment", "docker", "monitoring"],
  },
  {
    id: "cloud-infrastructure",
    name: "Cloud infrastructure",
    categoryId: "devops",
    definition:
      "Provisioning and operating cloud resources with explicit ownership and cost behaviour.",
    signals: ["merged_pull_request", "documentation", "release"],
    limitations:
      "Infrastructure-as-code is observable; console changes are not.",
    related: ["infrastructure-automation", "deployment", "monitoring"],
  },
  {
    id: "deployment",
    name: "Deployment",
    categoryId: "devops",
    definition:
      "Shipping a versioned system to an environment with a reversible path back.",
    signals: ["release", "merged_pull_request", "documentation"],
    limitations:
      "The MVP records releases from repository metadata, not from live environments.",
    related: ["ci-cd", "docker", "monitoring"],
  },
  {
    id: "monitoring",
    name: "Monitoring",
    categoryId: "devops",
    definition:
      "Instrumenting a system so failure is visible before a user reports it.",
    signals: ["merged_pull_request", "documentation", "issue_resolution"],
    limitations:
      "Observability configuration is private in most organisations.",
    related: ["deployment", "performance-optimization"],
  },
  {
    id: "infrastructure-automation",
    name: "Infrastructure automation",
    categoryId: "devops",
    definition:
      "Encoding operational work as repeatable, reviewable automation.",
    signals: ["merged_pull_request", "documentation", "commit_series"],
    limitations:
      "Automation breadth says nothing about its safety or idempotency.",
    related: ["cloud-infrastructure", "ci-cd", "python"],
  },

  // Collaboration -----------------------------------------------------------
  {
    id: "code-review",
    name: "Code review",
    categoryId: "collaboration",
    definition:
      "Reading another person's change closely enough to leave a useful, specific response.",
    signals: ["code_review", "merged_pull_request"],
    limitations:
      "Review volume is not review quality; a one-word approval counts the same as a detailed comment.",
    related: ["technical-communication", "design-patterns"],
  },
  {
    id: "documentation",
    name: "Documentation",
    categoryId: "collaboration",
    definition:
      "Writing durable explanation for people who were not present when a decision was made.",
    signals: ["documentation", "merged_pull_request"],
    limitations:
      "Documentation is classified from changed paths and commit metadata, not from reading the prose.",
    related: ["architecture-documentation", "technical-communication"],
  },
  {
    id: "open-source",
    name: "Open-source contributions",
    categoryId: "collaboration",
    definition:
      "Contributing attributable work to projects the person does not own.",
    signals: ["merged_pull_request", "issue_resolution", "code_review"],
    limitations:
      "Maintainer authority and review rights are not visible in contribution metadata.",
    related: ["project-collaboration", "code-review"],
  },
  {
    id: "project-collaboration",
    name: "Project collaboration",
    categoryId: "collaboration",
    definition:
      "Working inside a shared project's conventions, review flow and release rhythm.",
    signals: ["merged_pull_request", "code_review", "issue_resolution"],
    limitations:
      "Co-authorship is inferred from repository participation, not from team records.",
    related: ["open-source", "technical-communication"],
  },
  {
    id: "technical-communication",
    name: "Technical communication",
    categoryId: "collaboration",
    definition:
      "Making a technical point understandable to the person who needs it.",
    signals: ["documentation", "code_review", "issue_resolution"],
    limitations:
      "This MVP explicitly cannot establish communication ability from contribution metadata alone.",
    related: ["documentation", "code-review"],
  },
];

export const SKILLS_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function skillsInCategory(categoryId: SkillCategoryId): Skill[] {
  return SKILLS.filter((skill) => skill.categoryId === categoryId);
}

export function isSkillId(value: string): boolean {
  return SKILLS_BY_ID.has(value);
}

export function skillName(id: string): string {
  return SKILLS_BY_ID.get(id)?.name ?? id;
}
