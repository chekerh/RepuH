/**
 * Hedera Smart Contract Service anchoring.
 *
 * The application submits a batch's Merkle root to the deployed
 * `EvidenceAnchor` contract (`contracts/EvidenceAnchor.sol`). The contract holds
 * one 32-byte root per batch id and rejects a duplicate id, so a batch's root
 * cannot be replaced after submission.
 *
 * What is on-chain: a Merkle root and a batch id. Never a name, username, email,
 * evidence payload, estimate or project name.
 *
 * "Confirmed" is only reported after the contract call returns SUCCESS **and** a
 * read-back through `getRoot` returns the submitted root. A receipt alone proves
 * the transaction was paid for, not that the value landed.
 */

import {
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Status,
} from "@hashgraph/sdk";
import BigNumber from "bignumber.js";
import { env } from "@/lib/env";
import { hederaContractReady, hederaNetwork, operatorKey } from "@/lib/hedera/config";
import { hederaClient } from "@/lib/hedera/client";

/** A `submitRoot` call writes one slot; 250k is ample and bounded on purpose. */
export const SUBMIT_ROOT_GAS = 250_000;
/** `getRoot` is a view call. */
export const READ_ROOT_GAS = 100_000;

export interface ContractAnchorReceipt {
  transactionId: string;
  contractId: string;
  consensusTimestamp: string;
  root: string;
}

const ROOT_PATTERN = /^[0-9a-f]{64}$/;
const MAX_UINT256 = (1n << 256n) - 1n;

/**
 * The SDK encodes uint256 as a BigNumber; the on-chain batch key is a 256-bit
 * digest, so it cannot travel as a JS number or a Long.
 */
export function uint256Param(value: bigint): BigNumber {
  if (value <= 0n || value > MAX_UINT256) {
    throw new Error("A contract batch key must be a positive uint256");
  }
  return new BigNumber(value.toString(10));
}

export function rootToBytes32(root: string): Uint8Array {
  if (!ROOT_PATTERN.test(root)) {
    throw new Error("Merkle root must be 64 lowercase hex characters");
  }
  return Uint8Array.from(Buffer.from(root, "hex"));
}

export function bytes32ToRoot(value: Uint8Array): string {
  return Buffer.from(value).toString("hex").toLowerCase();
}

/**
 * Submit one root and wait for the receipt plus a read-back.
 * Throws on anything short of a confirmed, readable root: no anchor row is
 * written for a transaction that did not land.
 */
export async function submitRootOnContract(input: {
  root: string;
  /** Globally unique batch key, derived from the account and its batch number. */
  onChainBatchId: bigint;
}): Promise<ContractAnchorReceipt> {
  if (!hederaContractReady()) {
    throw new Error("Hedera smart contract anchoring is not configured");
  }
  const contractId = ContractId.fromString(env.hedera.contractId);
  const instance = hederaClient();
  try {
    const params = new ContractFunctionParameters()
      .addBytes32(rootToBytes32(input.root))
      .addUint256(uint256Param(input.onChainBatchId));

    const response = await new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(SUBMIT_ROOT_GAS)
      .setFunction("submitRoot", params)
      .execute(instance);

    const receipt = await response.getReceipt(instance);
    if (receipt.status !== Status.Success) {
      throw new Error(`The EvidenceAnchor call did not succeed (${receipt.status.toString()})`);
    }

    const stored = await readRootFromContract(instance, contractId.toString(), input.onChainBatchId);
    if (stored !== input.root) {
      throw new Error(
        "The anchor transaction succeeded but the contract does not return the submitted root",
      );
    }

    const record = await response.getRecord(instance);
    return {
      transactionId: response.transactionId.toString(),
      contractId: contractId.toString(),
      consensusTimestamp: record.consensusTimestamp.toString(),
      root: stored,
    };
  } finally {
    instance.close();
  }
}

/** Read the stored root for a batch id. Requires the configured operator. */
export async function readAnchorRoot(
  contractId: string,
  onChainBatchId: bigint,
): Promise<{ root: string | null; reason: string }> {
  if (!operatorKey()) {
    return { root: null, reason: "A Hedera operator is required to read contract state." };
  }
  const instance = hederaClient();
  try {
    const root = await readRootFromContract(instance, contractId, onChainBatchId);
    return { root, reason: root === null ? "The contract has no root for that batch id." : "" };
  } catch (cause) {
    return {
      root: null,
      reason:
        cause instanceof Error
          ? `The contract state could not be read: ${cause.message}`
          : "The contract state could not be read.",
    };
  } finally {
    instance.close();
  }
}

async function readRootFromContract(
  instance: ReturnType<typeof hederaClient>,
  contractId: string,
  onChainBatchId: bigint,
): Promise<string | null> {
  const result = await new ContractCallQuery()
    .setContractId(ContractId.fromString(contractId))
    .setGas(READ_ROOT_GAS)
    .setFunction("getRoot", new ContractFunctionParameters().addUint256(uint256Param(onChainBatchId)))
    .execute(instance);
  const root = bytes32ToRoot(result.getBytes32(0));
  // The contract returns bytes32(0) for an unknown batch id.
  return /^0+$/.test(root) ? null : root;
}

/** HashScan contract page. Read-only, no credentials needed. */
export function contractExplorerUrl(contractId: string): string {
  const network = hederaNetwork();
  return `https://hashscan.io/${network}/contract/${contractId}`;
}

/** HashScan transaction page for a contract call or creation. */
export function transactionExplorerUrl(transactionId: string): string {
  const network = hederaNetwork();
  return `https://hashscan.io/${network}/transaction/${encodeURIComponent(transactionId)}`;
}
