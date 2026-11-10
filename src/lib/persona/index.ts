/**
 * Public, signed persona manifest.
 *
 * A persona is a machine-readable projection of an evidence-backed profile.
 * It contains only public data: the public profile, public evidence-derived
 * capability estimates, public evidence items, anchors and active certificates.
 *
 * It is signed with the same Ed25519 key as certificates, so a holder can
 * prove the manifest came from this deployment without trusting the transport.
 */

import { env } from "@/lib/env";
import {
  getProfileByUsername,
  listAnchors,
  listPublicCertificates,
  publicEvidenceFor,
} from "@/lib/db/queries";
import { computeFingerprint } from "@/lib/services/ingest";
import { SKILLS_BY_ID } from "@/lib/ontology";
import { signPersona, parseCertificatePayload } from "@/lib/certificates/sign";
import { ROLE_PROFILES, buildRoleCoverage } from "@/lib/roles";

export const PERSONA_VERSION = "repuh-persona-1" as const;

export interface PersonaCapability {
  skillId: string;
  skillName: string;
  categoryId: string;
  estimate: number | null;
  confidence: number;
  status: string;
  evidenceCount: number;
  projectCount: number;
  sourceCount: number;
  algorithmVersion: string;
  limitations: string[];
}

export interface PersonaEvidence {
  id: string;
  signal: string;
  occurredAt: string;
  visibility: string;
  contentHash: string;
  title: string;
}

export interface PersonaAnchor {
  batchId: number;
  merkleRoot: string;
  provider: string;
  network: string;
  status: string;
  leafCount: number;
  topicId: string | null;
  sequenceNumber: number | null;
  consensusTimestamp: string | null;
}

export interface PersonaCertificate {
  id: string;
  skillId: string;
  skillName: string;
  estimate: number | null;
  anchorStatus: string;
  anchorSequence: number | null;
  payloadHash: string;
  signature: string;
  keyId: string;
  publicUrl: string | null;
}

export interface PersonaRoleCoverage {
  roleId: string;
  roleName: string;
  coreCovered: number;
  coreTotal: number;
  supportingCovered: number;
  supportingTotal: number;
  gaps: string[];
}

export interface PersonaManifest {
  v: typeof PERSONA_VERSION;
  generatedAt: string;
  subject: {
    username: string;
    publicId: string;
    displayName: string;
    headline: string | null;
    specialization: string | null;
    country: string | null;
    visibility: string;
    isDemo: boolean;
  };
  targetRole: string | null;
  capabilities: PersonaCapability[];
  evidence: PersonaEvidence[];
  anchors: PersonaAnchor[];
  certificates: PersonaCertificate[];
  roleCoverage: PersonaRoleCoverage[];
  sources: string[];
  verification: {
    algorithm: "Ed25519";
    keyId: string;
    publicKeyUrl: string;
    signature: string;
  };
  limitations: string[];
}

export function buildPersonaManifest(
  username: string,
  now = new Date(),
): PersonaManifest | null {
  const profile = getProfileByUsername(username);
  if (!profile) return null;
  if (profile.visibility === "private") return null;

  const { fingerprint, evidence } = computeFingerprint(profile.userId);
  const anchors = listAnchors(profile.userId);
  const certificates = listPublicCertificates(profile.userId);

  const capabilities: PersonaCapability[] = fingerprint.skills
    .filter((skill) => SKILLS_BY_ID.has(skill.skillId))
    .map((skill) => {
      const skillDef = SKILLS_BY_ID.get(skill.skillId)!;
      return {
        skillId: skill.skillId,
        skillName: skillDef.name,
        categoryId: skillDef.categoryId,
        estimate: skill.estimate,
        confidence: skill.confidence,
        status: skill.status,
        evidenceCount: skill.evidenceCount,
        projectCount: skill.projectCount,
        sourceCount: skill.sourceCount,
        algorithmVersion: skill.algorithmVersion,
        limitations: skill.limitations,
      };
    });

  const publicEvidence = publicEvidenceFor(profile.userId).slice(0, 40);
  const personaEvidence: PersonaEvidence[] = publicEvidence.map((item) => ({
    id: item.id,
    signal: item.signal,
    occurredAt: item.occurredAt,
    visibility: item.visibility,
    contentHash: item.contentHash,
    title: item.title,
  }));

  const sources = Array.from(
    new Set(publicEvidence.flatMap((item) => [item.source])),
  ).sort();

  const personaCertificates: PersonaCertificate[] = certificates.map((certificate) => {
    const payload = parseCertificatePayload(certificate.payload);
    return {
      id: certificate.id,
      skillId: certificate.skillId,
      skillName: payload?.claim.skillName ?? certificate.skillId,
      estimate: payload?.claim.estimate ?? null,
      anchorStatus: certificate.anchorStatus,
      anchorSequence: certificate.anchorSequence,
      payloadHash: certificate.payloadHash,
      signature: certificate.signature,
      keyId: certificate.keyId,
      publicUrl: env.appUrl ? `${env.appUrl}/certificate/${certificate.id}` : null,
    };
  });

  const personaAnchors: PersonaAnchor[] = anchors.map((anchor) => ({
    batchId: anchor.batchId,
    merkleRoot: anchor.merkleRoot,
    provider: anchor.provider,
    network: anchor.network,
    status: anchor.status,
    leafCount: anchor.leafCount,
    topicId: anchor.topicId,
    sequenceNumber: anchor.sequenceNumber,
    consensusTimestamp: anchor.consensusTimestamp,
  }));

  const roleCoverage = ROLE_PROFILES.map((roleProfile) => {
    const coverage = buildRoleCoverage(profile.userId, roleProfile.id);
    if (!coverage) return null;
    return {
      roleId: roleProfile.id,
      roleName: roleProfile.name,
      coreCovered: coverage.coreCovered,
      coreTotal: coverage.coreTotal,
      supportingCovered: coverage.supportingCovered,
      supportingTotal: coverage.supportingTotal,
      gaps: coverage.gaps.map((gap) => gap.skillName),
    };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const manifestWithoutSignature = {
    v: PERSONA_VERSION,
    generatedAt: now.toISOString(),
    subject: {
      username: profile.username,
      publicId: profile.publicId,
      displayName: profile.displayName,
      headline: profile.headline,
      specialization: profile.specialization,
      country: profile.country,
      visibility: profile.visibility,
      isDemo: Boolean(profile.isDemo),
    },
    targetRole: profile.specialization ?? profile.headline ?? null,
    capabilities,
    evidence: personaEvidence,
    anchors: personaAnchors,
    certificates: personaCertificates,
    roleCoverage,
    sources,
    limitations: [
      "Estimates are derived from attributable evidence by a deterministic classifier.",
      "Private evidence may contribute to estimates but is never included in this manifest.",
      "A certificate is a signed record at one moment, not a grade or a guarantee.",
    ],
  };

  const { signature, keyId } = signPersona(manifestWithoutSignature);

  const manifest: PersonaManifest = {
    ...manifestWithoutSignature,
    verification: {
      algorithm: "Ed25519",
      keyId,
      publicKeyUrl: env.appUrl
        ? `${env.appUrl}/api/certificates/key`
        : "/api/certificates/key",
      signature,
    },
  };

  return manifest;
}

export function renderPersonaMarkdown(manifest: PersonaManifest): string {
  const lines: string[] = [];
  lines.push(`# Persona: ${manifest.subject.displayName}`);
  lines.push("");
  lines.push(`@${manifest.subject.username} · ${manifest.subject.specialization ?? "Software engineer"}`);
  lines.push("");
  lines.push("## Identity");
  lines.push("");
  lines.push(`- Public ID: \`${manifest.subject.publicId}\``);
  lines.push(`- Visibility: ${manifest.subject.visibility}`);
  lines.push(`- Generated: ${manifest.generatedAt}`);
  if (manifest.subject.isDemo) lines.push("- DEMO PROFILE: labelled development data");
  lines.push("");
  lines.push("## Target role");
  lines.push("");
  lines.push(manifest.targetRole ?? "Not stated");
  lines.push("");
  lines.push("## Capabilities");
  lines.push("");
  lines.push("| Capability | Estimate | Confidence | Status | Evidence | Projects | Sources |");
  lines.push("|---|---:|---:|---|---:|---:|---:|");
  for (const capability of manifest.capabilities.filter((item) => item.estimate !== null)) {
    lines.push(
      `| ${capability.skillName} | ${capability.estimate} | ${capability.confidence} | ${capability.status} | ${capability.evidenceCount} | ${capability.projectCount} | ${capability.sourceCount} |`,
    );
  }
  if (manifest.capabilities.every((item) => item.estimate === null)) {
    lines.push("| _No established capabilities yet_ | | | | | | |");
  }
  lines.push("");
  for (const capability of manifest.capabilities.filter((item) => item.estimate !== null)) {
    lines.push(`### ${capability.skillName}`);
    lines.push("");
    lines.push(`- Algorithm: \`${capability.algorithmVersion}\``);
    lines.push(`- Limitations: ${capability.limitations.join(" ")}`);
    lines.push("");
  }
  lines.push("## Public evidence");
  lines.push("");
  if (manifest.evidence.length === 0) {
    lines.push("No public evidence items.");
  } else {
    for (const item of manifest.evidence) {
      lines.push(`- \`${item.id}\` · ${item.signal} · ${item.occurredAt} · \`${item.contentHash.slice(0, 12)}…\` · ${item.title}`);
    }
  }
  lines.push("");
  lines.push("## Anchors");
  lines.push("");
  if (manifest.anchors.length === 0) {
    lines.push("No anchors recorded.");
  } else {
    for (const anchor of manifest.anchors) {
      lines.push(
        `- Batch ${anchor.batchId}: ${anchor.status} · ${anchor.provider} · ${anchor.network} · root \`${anchor.merkleRoot.slice(0, 16)}…\` · ${anchor.leafCount} leaves` +
          (anchor.sequenceNumber !== null ? ` · sequence ${anchor.sequenceNumber}` : ""),
      );
    }
  }
  lines.push("");
  lines.push("## Certificates");
  lines.push("");
  if (manifest.certificates.length === 0) {
    lines.push("No active certificates.");
  } else {
    for (const certificate of manifest.certificates) {
      lines.push(
        `- \`${certificate.id}\` · ${certificate.skillName} · estimate ${certificate.estimate ?? "n/a"} · ${certificate.anchorStatus}` +
          (certificate.publicUrl ? ` · ${certificate.publicUrl}` : ""),
      );
    }
  }
  lines.push("");
  lines.push("## Role coverage");
  lines.push("");
  if (manifest.roleCoverage.length === 0) {
    lines.push("No role profiles available.");
  } else {
    lines.push("| Role | Core | Supporting | Gaps |");
    lines.push("|---|---:|---:|---|");
    for (const role of manifest.roleCoverage) {
      lines.push(
        `| ${role.roleName} | ${role.coreCovered}/${role.coreTotal} | ${role.supportingCovered}/${role.supportingTotal} | ${role.gaps.length > 0 ? role.gaps.join(", ") : "none" } |`,
      );
    }
  }
  lines.push("");
  lines.push("## Sources");
  lines.push("");
  lines.push(manifest.sources.length > 0 ? manifest.sources.map((source) => `- ${source}`).join("\n") : "No public sources.");
  lines.push("");
  lines.push("## Verification");
  lines.push("");
  lines.push(`- Algorithm: ${manifest.verification.algorithm}`);
  lines.push(`- Key ID: \`${manifest.verification.keyId}\``);
  lines.push(`- Public key: ${manifest.verification.publicKeyUrl}`);
  lines.push(`- Signature: \`${manifest.verification.signature}\``);
  lines.push("");
  lines.push("The signature is over the canonical JSON form of the manifest below. Recompute the canonical bytes, then verify the Ed25519 signature against the published public key.");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(manifest, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  for (const limitation of manifest.limitations) {
    lines.push(`- ${limitation}`);
  }
  lines.push("");
  return lines.join("\n");
}

export { SKILLS_BY_ID };
