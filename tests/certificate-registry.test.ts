import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ganache from "ganache";
import { certificateRegistryKey } from "../src/lib/hedera/certificate-contract.ts";

const artifact = JSON.parse(readFileSync("contracts/artifacts/CertificateRegistry.json", "utf8")) as {
  sourceSha256: string; bytecode: string; methodIdentifiers: Record<string, string>;
};

test("certificate artifact corresponds to source; registry ids are stable and domain-separated", () => {
  assert.equal(artifact.sourceSha256, createHash("sha256").update(readFileSync("contracts/CertificateRegistry.sol")).digest("hex"));
  assert.equal(certificateRegistryKey("crt_1"), certificateRegistryKey("crt_1"));
  assert.notEqual(certificateRegistryKey("crt_1"), certificateRegistryKey("crt_2"));
  assert.notEqual(certificateRegistryKey("crt_1"), createHash("sha256").update("crt_1").digest("hex"));
  assert.throws(() => certificateRegistryKey(""));
});

test("CertificateRegistry executes issuance, permission checks and irreversible revocation in an EVM", async () => {
  const provider = ganache.provider({ logging: { quiet: true }, wallet: { deterministic: true }, chain: { hardfork: "london" } });
  async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
    return provider.request({ method, params } as Parameters<typeof provider.request>[0]);
  }
  try {
    const accounts = await rpc("eth_accounts") as string[];
    const [owner, issuer, stranger] = accounts;
    assert.ok(owner && issuer && stranger);
    const deployment = await rpc("eth_sendTransaction", [{ from: owner, data: artifact.bytecode, gas: "0x300000" }]);
    const deployed = await rpc("eth_getTransactionReceipt", [deployment]) as { contractAddress: string; status: string };
    assert.equal(deployed.status, "0x1");
    const contract = deployed.contractAddress;
    function data(signature: string, words: string[]) {
      const selector = artifact.methodIdentifiers[signature];
      assert.ok(selector, signature);
      return `0x${selector}${words.join("")}`;
    }
    async function send(from: string, signature: string, words: string[]) {
      const transaction = await rpc("eth_sendTransaction", [{ from, to: contract, data: data(signature, words), gas: "0x80000" }]);
      const receipt = await rpc("eth_getTransactionReceipt", [transaction]) as { status: string; logs: unknown[] };
      assert.equal(receipt.status, "0x1", signature);
      return receipt;
    }
    async function rejected(from: string, signature: string, words: string[]) {
      await assert.rejects(rpc("eth_call", [{ from, to: contract, data: data(signature, words) }, "latest"]));
    }
    const id = certificateRegistryKey("crt_test");
    const hash = "ab".repeat(32);
    const zero = "0".repeat(64);
    const addressWord = (address: string) => address.slice(2).padStart(64, "0");
    await rejected(stranger, "issueCertificate(bytes32,bytes32)", [id, hash]);
    await rejected(stranger, "setIssuer(address,bool)", [addressWord(stranger), zero.slice(0, 63) + "1"]);
    await rejected(owner, "setIssuer(address,bool)", [zero, zero]);
    await rejected(owner, "issueCertificate(bytes32,bytes32)", [zero, hash]);
    await rejected(owner, "issueCertificate(bytes32,bytes32)", [id, zero]);
    await send(owner, "setIssuer(address,bool)", [addressWord(issuer), zero.slice(0, 63) + "1"]);
    const issued = await send(issuer, "issueCertificate(bytes32,bytes32)", [id, hash]);
    assert.equal(issued.logs.length, 1);
    const read = async () => (await rpc("eth_call", [{ to: contract, data: data("getCertificate(bytes32)", [id]) }, "latest"]) as string).slice(2);
    const record = await read();
    assert.equal(record.slice(0, 64), hash);
    assert.equal(record.slice(64, 128), addressWord(issuer));
    assert.ok(BigInt(`0x${record.slice(128, 192)}`) > 0n);
    assert.equal(BigInt(`0x${record.slice(192, 256)}`), 0n);
    await rejected(issuer, "issueCertificate(bytes32,bytes32)", [id, hash]);
    await rejected(owner, "revokeCertificate(bytes32)", [id]);
    await rejected(stranger, "revokeCertificate(bytes32)", [id]);
    await rejected(issuer, "revokeCertificate(bytes32)", [zero]);
    // Disabling an issuer stops new issuance without preventing cleanup of its records.
    await send(owner, "setIssuer(address,bool)", [addressWord(issuer), zero]);
    await rejected(issuer, "issueCertificate(bytes32,bytes32)", [certificateRegistryKey("crt_other"), hash]);
    const revoked = await send(issuer, "revokeCertificate(bytes32)", [id]);
    assert.equal(revoked.logs.length, 1);
    assert.equal(BigInt(`0x${(await read()).slice(192, 256)}`), 1n);
    const retry = await send(issuer, "revokeCertificate(bytes32)", [id]);
    assert.equal(retry.logs.length, 0);
    await send(owner, "setIssuer(address,bool)", [addressWord(issuer), zero.slice(0, 63) + "1"]);
    await rejected(issuer, "issueCertificate(bytes32,bytes32)", [id, "cd".repeat(32)]);
    assert.equal((await read()).slice(0, 64), hash);
  } finally {
    await provider.disconnect();
  }
});
