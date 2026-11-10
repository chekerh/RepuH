/**
 * Deploys the compiled EvidenceAnchor contract to Hedera Smart Contract Service.
 *
 * Run with: pnpm contracts:deploy
 * Requires HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local, and a
 * compiled artifact (`pnpm contracts:build`). Prints the contract id to add as
 * HEDERA_CONTRACT_ID. Never prints or writes the operator key.
 *
 * This deploys a new contract. It does not upgrade or replace an existing one:
 * old roots stay readable at their original contract id.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ContractCreateFlow } from "@hashgraph/sdk";
import { hederaNetwork, hederaOperatorReady, hederaStatus } from "../src/lib/hedera/config";
import { hederaClient } from "../src/lib/hedera/client";
import { contractExplorerUrl } from "../src/lib/hedera/contract";

interface Artifact {
  contractName: string;
  compiler: string;
  bytecode: string;
  sourceSha256: string;
  methodIdentifiers: Record<string, string>;
}

async function main() {
  const status = hederaStatus();
  console.log(`[repuh] Hedera network: ${hederaNetwork()}`);

  if (!hederaOperatorReady()) {
    console.error(
      "[repuh] HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY are required. Add them to .env.local; never commit them.",
    );
    process.exitCode = 1;
    return;
  }

  if (status.contractId) {
    console.log(`[repuh] HEDERA_CONTRACT_ID is already set: ${status.contractId}`);
    console.log(
      "[repuh] that contract is used as-is. To deploy a replacement, unset HEDERA_CONTRACT_ID and run this again; old roots remain at the old id.",
    );
    console.log(`[repuh] explorer: ${contractExplorerUrl(status.contractId)}`);
    return;
  }

  const artifactPath = path.resolve(process.cwd(), "contracts/artifacts/EvidenceAnchor.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as Artifact;
  if (artifact.contractName !== "EvidenceAnchor" || !artifact.bytecode.startsWith("0x")) {
    console.error(`[repuh] ${artifactPath} is not the expected compiled artifact.`);
    process.exitCode = 1;
    return;
  }
  console.log(`[repuh] artifact: ${artifact.contractName}, solc ${artifact.compiler}`);
  console.log(`[repuh] source sha256: ${artifact.sourceSha256}`);

  const client = hederaClient();
  try {
    const response = await new ContractCreateFlow()
      .setBytecode(artifact.bytecode)
      .setGas(2_000_000)
      .setContractMemo("RepuH EvidenceAnchor v1")
      .execute(client);
    const receipt = await response.getReceipt(client);
    if (!receipt.contractId) {
      throw new Error("Contract creation returned no contract id");
    }
    const contractId = receipt.contractId.toString();
    console.log(`[repuh] created contract ${contractId} in transaction ${response.transactionId.toString()}`);
    console.log("[repuh] add this line to .env.local, then restart the app:");
    console.log(`HEDERA_CONTRACT_ID=${contractId}`);
    console.log(`[repuh] explorer: ${contractExplorerUrl(contractId)}`);
    console.log(
      "[repuh] the contract is unaudited. Testnet only unless a mainnet deployment is a deliberate decision.",
    );
  } catch (cause) {
    console.error(
      `[repuh] deployment failed: ${cause instanceof Error ? cause.message : "unknown error"}`,
    );
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

main().catch((cause) => {
  console.error(`[repuh] deployment failed: ${cause instanceof Error ? cause.message : "unknown error"}`);
  process.exitCode = 1;
});
