/**
 * Hedera configuration state.
 *
 * The integration is only reported as configured when an operator, its key and
 * a topic id are all present. A partial configuration is a *not configured*
 * state with the missing variable names exposed — never a simulated connection.
 */

import { PrivateKey } from "@hashgraph/sdk";
import { env } from "@/lib/env";

export type HederaNetwork = "mainnet" | "testnet" | "previewnet";

export interface HederaStatus {
  configured: boolean;
  network: HederaNetwork;
  operatorId: string | null;
  topicId: string | null;
  missing: string[];
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
  const missing: string[] = [];
  if (!env.hedera.operatorId) missing.push("HEDERA_OPERATOR_ID");
  if (!env.hedera.operatorKey) missing.push("HEDERA_OPERATOR_KEY");
  if (!env.hedera.topicId) missing.push("HEDERA_TOPIC_ID");

  const network = hederaNetwork();

  return {
    configured: missing.length === 0,
    network,
    operatorId: env.hedera.operatorId || null,
    topicId: env.hedera.topicId || null,
    missing,
    reason:
      missing.length === 0
        ? `Hedera ${network} consensus service is configured for this deployment.`
        : `Hedera anchoring is not configured. Add ${missing.join(", ")} to enable it.`,
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

/** True when an operator id and a parseable key exist (topic not required). */
export function hederaOperatorReady(): boolean {
  return Boolean(env.hedera.operatorId) && operatorKey() !== null;
}

/** True when credentials exist and the key is actually parseable. */
export function hederaReady(): boolean {
  return hederaStatus().configured && hederaOperatorReady();
}

export function topicExplorerUrl(topicId: string, sequence?: number | null): string {
  const base = `${hederaStatus().explorerBase}/topic/${topicId}`;
  return typeof sequence === "number" ? `${base}?sequence=${sequence}` : base;
}
