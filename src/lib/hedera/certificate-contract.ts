/** CertificateRegistry adapter. Signed payloads remain unchanged and off-chain. */
import { ContractCallQuery, ContractExecuteTransaction, ContractFunctionParameters, Status } from "@hashgraph/sdk";
import { env } from "@/lib/env";
import { hederaClient } from "@/lib/hedera/client";
import { hederaNetwork, hederaOperatorReady } from "@/lib/hedera/config";
import { rootToBytes32, bytes32ToRoot } from "@/lib/hedera/contract";
import { sha256Hex } from "@/lib/integrity/merkle";

export function certificateRegistryKey(id: string): string {
  if (!id) throw new Error("Certificate id is required");
  return sha256Hex(`repuh.certificate-registry.v1|${id}`);
}

export function certificateRegistryReady(): boolean {
  return Boolean(env.hedera.certificateContractId) && hederaOperatorReady();
}

export interface RegistryRecord {
  payloadHash: string;
  issuer: string;
  issuedAt: string;
  revoked: boolean;
}

type Client = ReturnType<typeof hederaClient>;
async function read(client: Client, contractId: string, id: string): Promise<RegistryRecord> {
  const result = await new ContractCallQuery().setContractId(contractId).setGas(100_000)
    .setFunction("getCertificate", new ContractFunctionParameters().addBytes32(rootToBytes32(certificateRegistryKey(id))))
    .execute(client);
  return {
    payloadHash: bytes32ToRoot(result.getBytes32(0)),
    issuer: result.getAddress(1),
    issuedAt: result.getUint256(2).toString(),
    revoked: result.getBool(3),
  };
}

export async function readRegisteredCertificate(contractId: string, network: string, id: string) {
  if (network !== `hedera-${hederaNetwork()}` || !hederaOperatorReady()) {
    throw new Error("The recorded registry network requires a configured operator on that network.");
  }
  const client = hederaClient();
  try { return await read(client, contractId, id); }
  finally { client.close(); }
}

/** A registration is confirmed only with a receipt and a matching read-back. */
export async function registerCertificate(id: string, hash: string) {
  if (!certificateRegistryReady()) throw new Error("Certificate registry is not configured");
  const contractId = env.hedera.certificateContractId;
  const client = hederaClient();
  try {
    const params = new ContractFunctionParameters()
      .addBytes32(rootToBytes32(certificateRegistryKey(id))).addBytes32(rootToBytes32(hash));
    const response = await new ContractExecuteTransaction().setContractId(contractId).setGas(300_000)
      .setFunction("issueCertificate", params).execute(client);
    const receipt = await response.getReceipt(client);
    if (receipt.status !== Status.Success) throw new Error("Certificate registration did not succeed");
    const stored = await read(client, contractId, id);
    if (stored.payloadHash !== hash || stored.revoked || stored.issuedAt === "0") {
      throw new Error("Certificate registry read-back did not match");
    }
    return { contractId, network: `hedera-${hederaNetwork()}`, transactionId: response.transactionId.toString() };
  } finally { client.close(); }
}

export async function revokeRegisteredCertificate(contractId: string, network: string, id: string, hash: string) {
  if (network !== `hedera-${hederaNetwork()}` || !hederaOperatorReady()) {
    throw new Error("The recorded registry network requires a configured operator on that network.");
  }
  const client = hederaClient();
  try {
    const before = await read(client, contractId, id);
    if (before.payloadHash !== hash || before.issuedAt === "0") throw new Error("Registered certificate does not match");
    const response = await new ContractExecuteTransaction().setContractId(contractId).setGas(200_000)
      .setFunction("revokeCertificate", new ContractFunctionParameters().addBytes32(rootToBytes32(certificateRegistryKey(id))))
      .execute(client);
    const receipt = await response.getReceipt(client);
    if (receipt.status !== Status.Success) throw new Error("Certificate revocation did not succeed");
    const stored = await read(client, contractId, id);
    if (!stored.revoked || stored.payloadHash !== hash) throw new Error("Revocation read-back did not match");
    return response.transactionId.toString();
  } finally { client.close(); }
}
