/**
 * Preflight and topic creation for Hedera Consensus Service anchoring.
 *
 * Run with: pnpm hedera:setup
 * Requires HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local (or the
 * process environment). It never prints the key and never writes secrets to
 * disk; it prints the topic id for you to add yourself.
 */
import { hederaOperatorReady, hederaStatus } from "../src/lib/hedera/config";
import { createAnchorTopic, operatorBalanceHbar } from "../src/lib/hedera/hcs";

async function main() {
  const status = hederaStatus();
  console.log(`[repuh] Hedera network: ${status.network}`);

  if (!hederaOperatorReady()) {
    console.error(
      "[repuh] HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY are required. Add them to .env.local; never commit them.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const balance = await operatorBalanceHbar();
    console.log(`[repuh] operator balance: ${balance}`);
    if (Number.parseFloat(balance) <= 0) {
      console.warn("[repuh] balance is empty; request test HBAR from the Hedera portal faucet.");
    }
  } catch (cause) {
    console.error(
      `[repuh] could not read the operator balance: ${cause instanceof Error ? cause.message : "unknown error"}`,
    );
    process.exitCode = 1;
    return;
  }

  if (!status.contractId) {
    console.log(
      "[repuh] HEDERA_CONTRACT_ID is not set. Evidence batches will fall back to the topic below; run `pnpm contracts:deploy` to anchor them with the EvidenceAnchor contract.",
    );
  } else {
    console.log(`[repuh] HEDERA_CONTRACT_ID is set: ${status.contractId}`);
  }

  if (status.topicId) {
    console.log(`[repuh] HEDERA_TOPIC_ID is already set: ${status.topicId}`);
    console.log("[repuh] certificate hashes will be submitted to that topic. No new topic was created.");
    return;
  }

  try {
    const created = await createAnchorTopic();
    console.log(`[repuh] created topic ${created.topicId} in transaction ${created.transactionId}`);
    console.log("[repuh] add this line to .env.local, then restart the app:");
    console.log(`HEDERA_TOPIC_ID=${created.topicId}`);
  } catch (cause) {
    console.error(
      `[repuh] topic creation failed: ${cause instanceof Error ? cause.message : "unknown error"}`,
    );
    process.exitCode = 1;
  }
}

main().catch((cause) => {
  console.error(`[repuh] setup failed: ${cause instanceof Error ? cause.message : "unknown error"}`);
  process.exitCode = 1;
});
