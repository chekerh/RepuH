import type { EvidenceSignal } from "@/lib/ontology";
import type { NormalizedEventType } from "@/lib/evidence/classify";

export type Visibility = "private" | "public" | "selective";
export type IntegrationStatus = "connected" | "error" | "revoked" | "pending" | "demo";
export type ProcessingStatus = "processed" | "pending" | "skipped" | "failed";
export type AttributionStatus = "self" | "coauthored" | "unverified";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface Profile {
  userId: string;
  displayName: string;
  username: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  avatarUrl: string | null;
  profession: string;
  specialization: string | null;
  publicId: string;
  visibility: Visibility;
  onboardingComplete: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Preferences {
  userId: string;
  theme: "system" | "light" | "dark";
  reducedMotion: boolean;
  notifications: boolean;
  language: string;
  leaderboardOptIn: boolean;
}

export interface Integration {
  id: string;
  userId: string;
  provider: string;
  accountLogin: string | null;
  scopes: string[];
  status: IntegrationStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  source: string;
  eventType: NormalizedEventType;
  externalId: string;
  occurredAt: string;
  receivedAt: string;
  projectReference: string | null;
  skillCandidates: string[];
  attributionStatus: AttributionStatus;
  privacyStatus: Visibility;
  processingStatus: ProcessingStatus;
  payload: Record<string, unknown>;
  isDemo: boolean;
}

export interface Evidence {
  id: string;
  userId: string;
  eventId: string;
  title: string;
  summary: string;
  signal: EvidenceSignal;
  skillIds: string[];
  quality: number;
  visibility: Visibility;
  verificationState: "provisional" | "corroborated" | "disputed";
  contentHash: string;
  isDemo: boolean;
  createdAt: string;
  reasons: Array<{ skillId: string; rule: string }>;
  limitations: string[];
  occurredAt: string;
  projectReference: string | null;
  source: string;
}

export interface Anchor {
  id: string;
  userId: string;
  batchId: number;
  merkleRoot: string;
  provider: string;
  network: string;
  txRef: string | null;
  status: "local" | "submitted" | "confirmed" | "failed" | "unavailable";
  leafCount: number;
  topicId: string | null;
  sequenceNumber: number | null;
  consensusTimestamp: string | null;
  /** Set when the root was submitted to the EvidenceAnchor smart contract. */
  contractId: string | null;
  commitments: string[];
  createdAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  skillId: string;
  subjectUsername: string;
  payload: string;
  payloadHash: string;
  signature: string;
  keyId: string;
  status: "active" | "revoked";
  revokedAt: string | null;
  revocationReason: string | null;
  anchorNetwork: string | null;
  anchorTopicId: string | null;
  anchorSequence: number | null;
  anchorTxRef: string | null;
  anchorStatus: "unavailable" | "local" | "submitted" | "confirmed" | "failed";
  evidenceRoot: string;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  scope: string;
  version: string;
  granted: boolean;
  createdAt: string;
  revokedAt: string | null;
}

export interface Project {
  id: string;
  userId: string;
  reference: string;
  name: string;
  source: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: Profile;
  preferences: Preferences;
}
