/**
 * One place that builds the Hedera SDK client.
 *
 * Anchoring happens through two services (consensus and smart contracts) and
 * both must use the same operator and network. Keeping the client here stops
 * the two paths from drifting apart or silently using a different network.
 */

import { AccountId, Client } from "@hashgraph/sdk";
import { env } from "@/lib/env";
import { hederaNetwork, operatorKey } from "@/lib/hedera/config";

export function hederaClient(): Client {
  const network = hederaNetwork();
  const instance =
    network === "mainnet"
      ? Client.forMainnet()
      : network === "previewnet"
        ? Client.forPreviewnet()
        : Client.forTestnet();
  instance.setRequestTimeout(20_000);
  const key = operatorKey();
  if (!key) {
    instance.close();
    throw new Error("Hedera operator key is missing or unparseable");
  }
  instance.setOperator(AccountId.fromString(env.hedera.operatorId), key);
  return instance;
}
