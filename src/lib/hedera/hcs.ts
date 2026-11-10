/**
 * Hedera Consensus Service (HCS) anchoring.
 *
 * What is submitted: a small JSON envelope containing a Merkle root and batch
 * metadata. HCS orders and timestamps it; the message becomes immutable once
 * consensus is reached. This path anchors certificate hashes and remains the
 * fallback for evidence batches when no EvidenceAnchor contract is configured.
 *
 * What is never submitted: names, usernames, emails, skills, estimates,
 * evidence payloads or project names. The envelope is the same information a
 * public Merkle root already exposes.
 *
 * HCS messages are capped at 1024 bytes. The envelope is designed to fit inside
 * one message so a failed or partial submit cannot look like a valid anchor.
 */

import { AccountBalanceQuery, AccountId, TopicCreateTransaction, TopicId, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { env } from "@/lib/env";
import { hederaNetwork, hederaOperatorReady, hederaReady } from "@/lib/hedera/config";
import { hederaClient } from "@/lib/hedera/client";
import { enforceMessageLimit, type AnchorEnvelope } from "@/lib/hedera/envelopes";

export { buildAnchorEnvelope, HCS_MESSAGE_LIMIT, HCS_PROTOCOL } from "@/lib/hedera/envelopes";
export type { AnchorEnvelope } from "@/lib/hedera/envelopes";

export interface HcsReceipt {
  transactionId: string;
  topicId: string;
  sequenceNumber: number;
  consensusTimestamp: string;
}

/**
 * Submit one anchor envelope. Returns only after consensus, so a recorded
 * sequence number always corresponds to a message the network actually ordered.
 */
export async function submitAnchorEnvelope(envelope: AnchorEnvelope): Promise<HcsReceipt> {
  return submitHcsMessage(envelope);
}

/** Generic single-message submit, used for anchors and certificates. */
export async function submitHcsMessage(envelope: object): Promise<HcsReceipt> {
  if (!hederaReady()) {
    throw new Error("Hedera is not configured");
  }
  const message = JSON.stringify(envelope);
  enforceMessageLimit(message);
  const topicId = TopicId.fromString(env.hedera.topicId);
  const instance = hederaClient();
  try {
    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(instance);

    const receipt = await response.getReceipt(instance);
    const record = await response.getRecord(instance);
    const sequence = receipt.topicSequenceNumber;
    if (sequence === null || sequence === undefined) {
      throw new Error("HCS receipt did not include a topic sequence number");
    }
    return {
      transactionId: response.transactionId.toString(),
      topicId: env.hedera.topicId,
      sequenceNumber: Number(sequence.toString()),
      consensusTimestamp: record.consensusTimestamp.toString(),
    };
  } finally {
    instance.close();
  }
}

/** Creates a topic for a deployment. Used by scripts/hedera-setup.ts only. */
export async function createAnchorTopic(memo = "RepuH evidence anchors v1") {
  if (!hederaOperatorReady()) {
    throw new Error("Hedera operator credentials are required to create a topic");
  }
  const instance = hederaClient();
  try {
    const response = await new TopicCreateTransaction().setTopicMemo(memo).execute(instance);
    const receipt = await response.getReceipt(instance);
    if (!receipt.topicId) throw new Error("Topic creation returned no topic id");
    return {
      topicId: receipt.topicId.toString(),
      transactionId: response.transactionId.toString(),
    };
  } finally {
    instance.close();
  }
}

/** Operator balance, used by the setup script as a preflight check. */
export async function operatorBalanceHbar(): Promise<string> {
  if (!hederaOperatorReady()) throw new Error("Hedera operator credentials are not configured");
  const instance = hederaClient();
  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(env.hedera.operatorId))
      .execute(instance);
    return balance.hbars.toString();
  } finally {
    instance.close();
  }
}

/**
 * Reads a topic message back from a public mirror node. This is a read-only
 * corroboration path that needs no credentials; the application does not depend
 * on the mirror node being reachable.
 */
export async function readMirrorMessage(
  topicId: string,
  sequenceNumber: number,
): Promise<{ message: string; consensusTimestamp: string } | null> {
  const network = hederaNetwork();
  const host =
    network === "mainnet"
      ? "https://mainnet-public.mirrornode.hedera.com"
      : network === "previewnet"
        ? "https://previewnet.mirrornode.hedera.com"
        : "https://testnet.mirrornode.hedera.com";
  try {
    const response = await fetch(
      `${host}/api/v1/topics/${topicId}/messages/${sequenceNumber}`,
      { cache: "no-store", signal: AbortSignal.timeout(5_000) },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      message?: string;
      consensus_timestamp?: string;
    };
    if (!payload.message) return null;
    return {
      message: Buffer.from(payload.message, "base64").toString("utf8"),
      consensusTimestamp: payload.consensus_timestamp ?? "",
    };
  } catch {
    return null;
  }
}
