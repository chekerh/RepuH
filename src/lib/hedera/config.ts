/**
 * Hedera configuration state.
 *
 * Three capabilities are reported separately: evidence roots, certificate registry,
 * and consensus receipts.
 *
 * - `contractConfigured` — the deployed `EvidenceAnchor` contract, used to
 *   anchor evidence batches. This is the primary integrity path.
 * - `certificateContractConfigured` — CertificateRegistry issuance and revocation.
 * - `configured` — the consensus-service topic, used to anchor certificate
 *   hashes. Unchanged meaning so the certificate and admin surfaces keep
 *   telling the truth about what is actually anchored.
 *
 * A partial configuration is a *not configured* state with the missing variable
 * names exposed — never a simulated connection.
 */

import { PrivateKey } from "@hashgraph/sdk";
import { env } from "@/lib/env";

export type HederaNetwork = "mainnet" | "testnet" | "previewnet";

export interface HederaStatus {
  /** Consensus-service (certificate) anchoring is fully configured. */
  configured: boolean;
  /** Smart-contract (evidence batch) anchoring is fully configured. */
  contractConfigured: boolean;
  certificateContractId: string | null;
  certificateContractConfigured: boolean;
  certificateContractMissing: string[];
  network: HederaNetwork;
  operatorId: string | null;
  topicId: string | null;
  contractId: string | null;
  /** Variables missing for consensus anchoring. */
  missing: string[];
  /** Variables missing for contract anchoring. */
  contractMissing: string[];
  reason: string;
  explorerBase: string;
}

const EXPLORERS: Record<HederaNetwork, string> = {
  mainnet: "https://hashscan.io/mainnet",
  testnet: "https://hashscan.io/testnet",
  previewnet: "https://hashscan.io/previewnet",
};

export function hederaNetwork(): HederaNetwork {
  const value = env.hedera.network;
  return value === "mainnet" || value === "previewnet" ? value : "testnet";
}

export function hederaStatus(): HederaStatus {
  const operatorMissing: string[] = [];
  if (!env.hedera.operatorId) operatorMissing.push("HEDERA_OPERATOR_ID");
  if (!env.hedera.operatorKey) operatorMissing.push("HEDERA_OPERATOR_KEY");

  const missing = [...operatorMissing];
  if (!env.hedera.topicId) missing.push("HEDERA_TOPIC_ID");

  const contractMissing = [...operatorMissing];
  if (!env.hedera.contractId) contractMissing.push("HEDERA_CONTRACT_ID");

  const network = hederaNetwork();
  const configured = missing.length === 0;
  const contractConfigured = contractMissing.length === 0;

  const reason =
    contractConfigured && configured
      ? `Evidence roots are submitted to the EvidenceAnchor contract on Hedera ${network}; certificate hashes go to the configured consensus topic.`
      : contractConfigured
        ? `Evidence roots are submitted to the EvidenceAnchor contract on Hedera ${network}. Add ${missing.join(", ")} to also anchor certificate hashes.`
        : configured
          ? `Certificate hashes are anchored to Hedera ${network} consensus. Add ${contractMissing.join(", ")} to anchor evidence roots with the contract.`
          : `Evidence and consensus anchoring are not configured. Add ${contractMissing.join(", ")} for contract anchoring and ${missing.join(", ")} for certificate hashes.`;

  return {
    configured,
    contractConfigured,
    certificateContractId: env.hedera.certificateContractId || null,
    certificateContractConfigured: operatorMissing.length === 0 && Boolean(env.hedera.certificateContractId),
    certificateContractMissing: [...operatorMissing, ...(!env.hedera.certificateContractId ? ["HEDERA_CERTIFICATE_CONTRACT_ID"] : [])],
    network,
    operatorId: env.hedera.operatorId || null,
    topicId: env.hedera.topicId || null,
    contractId: env.hedera.contractId || null,
    missing,
    contractMissing,
    reason: `${reason} ${env.hedera.certificateContractId && operatorMissing.length === 0
      ? `Certificate issuance and revocation use CertificateRegistry ${env.hedera.certificateContractId}.`
      : "CertificateRegistry is not configured."}`,
    explorerBase: EXPLORERS[network],
  };
}

/**
 * Parse the operator key without ever returning it in an API response.
 * Hedera accepts ED25519 and ECDSA (secp256k1) keys; the SDK decides by format.
 */
export function operatorKey(): PrivateKey | null {
  if (!env.hedera.operatorKey) return null;
  try {
    return PrivateKey.fromString(env.hedera.operatorKey);
  } catch {
    return null;
  }
}

/** True when an operator id and a parseable key exist (no topic or contract required). */
export function hederaOperatorReady(): boolean {
  return Boolean(env.hedera.operatorId) && operatorKey() !== null;
}

/** True when certificate (consensus) anchoring can actually be submitted. */
export function hederaReady(): boolean {
  return hederaStatus().configured && hederaOperatorReady();
}

/** True when the EvidenceAnchor contract can actually be called. */
export function hederaContractReady(): boolean {
  return hederaStatus().contractConfigured && hederaOperatorReady();
}

export function topicExplorerUrl(topicId: string, sequence?: number | null): string {
  const base = `${hederaStatus().explorerBase}/topic/${topicId}`;
  return typeof sequence === "number" ? `${base}?sequence=${sequence}` : base;
}
