/**
 * Role profiles and coverage.
 *
 * A role profile is an illustrative, versioned list of capabilities a role
 * typically requires. It is not a job description from a live employer and does
 * not produce a composite score: it maps requirements to the evidence-backed
 * estimates RepuH already computes, then reports which are established,
 * provisional or missing.
 */

import { computeFingerprint } from "@/lib/services/ingest";
import { SKILLS_BY_ID } from "@/lib/ontology";
import type { SkillEstimate } from "@/lib/scoring";

export const ROLE_PROFILE_VERSION = "repuh-roles-1.0.0";

export type RoleImportance = "core" | "supporting";

export interface RoleSkillRequirement {
  skillId: string;
  importance: RoleImportance;
  note?: string;
}

export interface RoleProfile {
  id: string;
  name: string;
  summary: string;
  requirements: RoleSkillRequirement[];
}

export const ROLE_PROFILES: RoleProfile[] = [
  {
    id: "frontend-engineer",
    name: "Frontend engineer",
    summary: "Builds browser interfaces that stay correct, accessible and fast.",
    requirements: [
      { skillId: "javascript", importance: "core" },
      { skillId: "typescript", importance: "core" },
      { skillId: "react", importance: "core" },
      { skillId: "ui-implementation", importance: "core" },
      { skillId: "responsive-development", importance: "core" },
      { skillId: "state-management", importance: "supporting" },
      { skillId: "accessibility", importance: "supporting" },
      { skillId: "nextjs", importance: "supporting" },
      { skillId: "code-review", importance: "supporting" },
    ],
  },
  {
    id: "backend-engineer",
    name: "Backend engineer",
    summary: "Designs and operates server-side systems, data and interfaces.",
    requirements: [
      { skillId: "api-development", importance: "core" },
      { skillId: "database-engineering", importance: "core" },
      { skillId: "sql", importance: "core" },
      { skillId: "authentication", importance: "core" },
      { skillId: "backend-architecture", importance: "core" },
      { skillId: "distributed-systems", importance: "supporting" },
      { skillId: "performance-optimization", importance: "supporting" },
      { skillId: "documentation", importance: "supporting" },
      { skillId: "code-review", importance: "supporting" },
    ],
  },
  {
    id: "full-stack-engineer",
    name: "Full-stack engineer",
    summary: "Owns a feature from interface to data store.",
    requirements: [
      { skillId: "javascript", importance: "core" },
      { skillId: "typescript", importance: "core" },
      { skillId: "react", importance: "core" },
      { skillId: "api-development", importance: "core" },
      { skillId: "database-engineering", importance: "core" },
      { skillId: "ui-implementation", importance: "supporting" },
      { skillId: "authentication", importance: "supporting" },
      { skillId: "deployment", importance: "supporting" },
      { skillId: "code-review", importance: "supporting" },
    ],
  },
  {
    id: "platform-engineer",
    name: "Platform engineer",
    summary: "Builds the layer other engineers stand on: infra, CI and delivery.",
    requirements: [
      { skillId: "docker", importance: "core" },
      { skillId: "ci-cd", importance: "core" },
      { skillId: "cloud-infrastructure", importance: "core" },
      { skillId: "infrastructure-automation", importance: "core" },
      { skillId: "monitoring", importance: "core" },
      { skillId: "deployment", importance: "supporting" },
      { skillId: "system-design", importance: "supporting" },
      { skillId: "documentation", importance: "supporting" },
    ],
  },
  {
    id: "software-architect",
    name: "Software architect",
    summary: "Makes structure, trade-offs and decisions durable.",
    requirements: [
      { skillId: "system-design", importance: "core" },
      { skillId: "backend-architecture", importance: "core" },
      { skillId: "design-patterns", importance: "core" },
      { skillId: "scalability", importance: "core" },
      { skillId: "distributed-systems", importance: "supporting" },
      { skillId: "technical-decision-making", importance: "supporting" },
      { skillId: "architecture-documentation", importance: "supporting" },
      { skillId: "technical-communication", importance: "supporting" },
    ],
  },
  {
    id: "open-source-maintainer",
    name: "Open-source maintainer",
    summary: "Sustains a public project through review, releases and community.",
    requirements: [
      { skillId: "open-source", importance: "core" },
      { skillId: "code-review", importance: "core" },
      { skillId: "documentation", importance: "core" },
      { skillId: "project-collaboration", importance: "core" },
      { skillId: "technical-communication", importance: "supporting" },
      { skillId: "ci-cd", importance: "supporting" },
    ],
  },
];

export interface RoleCoverageItem {
  skillId: string;
  skillName: string;
  importance: RoleImportance;
  estimate: number | null;
  confidence: number;
  status: SkillEstimate["status"];
  evidenceCount: number;
  projectCount: number;
  sourceCount: number;
  limitations: string[];
}

export interface RoleCoverage {
  role: RoleProfile;
  version: string;
  items: RoleCoverageItem[];
  coreTotal: number;
  coreCovered: number;
  supportingTotal: number;
  supportingCovered: number;
  gaps: RoleCoverageItem[];
}

export function getRoleProfile(roleId: string): RoleProfile | null {
  return ROLE_PROFILES.find((role) => role.id === roleId) ?? null;
}

export function buildRoleCoverage(userId: string, roleId: string): RoleCoverage | null {
  const role = getRoleProfile(roleId);
  if (!role) return null;

  const { fingerprint } = computeFingerprint(userId);
  const bySkill = new Map(fingerprint.skills.map((skill) => [skill.skillId, skill]));

  const items: RoleCoverageItem[] = role.requirements.map((requirement) => {
    const skill = SKILLS_BY_ID.get(requirement.skillId);
    const estimate = bySkill.get(requirement.skillId);
    return {
      skillId: requirement.skillId,
      skillName: skill?.name ?? requirement.skillId,
      importance: requirement.importance,
      estimate: estimate?.estimate ?? null,
      confidence: estimate?.confidence ?? 0,
      status: estimate?.status ?? "insufficient",
      evidenceCount: estimate?.evidenceCount ?? 0,
      projectCount: estimate?.projectCount ?? 0,
      sourceCount: estimate?.sourceCount ?? 0,
      limitations: estimate?.limitations ?? [skill?.limitations ?? "No evidence yet."],
    };
  });

  const core = items.filter((item) => item.importance === "core");
  const supporting = items.filter((item) => item.importance === "supporting");
  const covered = (item: RoleCoverageItem) =>
    item.estimate !== null && item.status !== "insufficient";

  return {
    role,
    version: ROLE_PROFILE_VERSION,
    items,
    coreTotal: core.length,
    coreCovered: core.filter(covered).length,
    supportingTotal: supporting.length,
    supportingCovered: supporting.filter(covered).length,
    gaps: items.filter((item) => !covered(item)),
  };
}
