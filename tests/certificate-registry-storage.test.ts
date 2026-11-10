import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "../src/lib/db/schema.ts";

test("existing certificate databases migrate; registry receipts survive reload and local revocation remains retryable", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "repuh-registry-"));
  process.env.REPUH_DATABASE_PATH = path.join(directory, "test.db");
  process.env.HEDERA_OPERATOR_ID = "";
  process.env.HEDERA_OPERATOR_KEY = "";
  const old = new Database(process.env.REPUH_DATABASE_PATH);
  old.exec(SCHEMA_SQL.replace(/^  registry_.*\n/gm, ""));
  old.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run("user-test", "registry@example.invalid", "not-a-login", "2026-11-10T00:00:00Z");
  old.close();
  const { getDb } = await import("../src/lib/db/index.ts");
  const { createCertificate, recordCertificateRegistry, findCertificate } = await import("../src/lib/db/queries.ts");
  const { revokeCertificate, verifyCertificateRegistry } = await import("../src/lib/certificates/service.ts");
  try {
    const columns = getDb().prepare("PRAGMA table_info(certificates)").all() as { name: string }[];
    for (const field of ["registry_contract_id", "registry_network", "registry_tx_ref", "registry_revocation_tx_ref"]) {
      assert.ok(columns.some((column) => column.name === field));
    }
    const certificate = createCertificate({ id: "crt_storage", userId: "user-test", skillId: "typescript", subjectUsername: "test", payload: "{}", payloadHash: "ab".repeat(32), signature: "fixture", keyId: "fixture", anchorNetwork: null, anchorTopicId: null, anchorSequence: null, anchorTxRef: null, anchorStatus: "unavailable", evidenceRoot: "cd".repeat(32) });
    assert.equal(certificate.registryContractId, null);
    assert.equal((await verifyCertificateRegistry(certificate)).checked, false);
    assert.equal(await revokeCertificate("other-user", certificate.id), null);
    const registered = recordCertificateRegistry("user-test", certificate.id, { contractId: "0.0.123", network: "hedera-testnet", transactionId: "test-receipt" });
    assert.equal(registered.payload, certificate.payload);
    assert.equal(findCertificate(certificate.id)?.registryTxRef, "test-receipt");
    assert.equal((await verifyCertificateRegistry(registered)).checked, false);
    const revoked = await revokeCertificate("user-test", certificate.id, "test revocation");
    assert.equal(revoked?.certificate.status, "revoked");
    assert.equal(revoked?.registryRevocation, "failed");
    assert.equal(findCertificate(certificate.id)?.registryRevocationTxRef, null);
    const retry = await revokeCertificate("user-test", certificate.id);
    assert.equal(retry?.registryRevocation, "failed");
    assert.equal(retry?.certificate.revocationReason, "test revocation");
    getDb().prepare("DELETE FROM users WHERE id = ?").run("user-test");
    assert.equal(findCertificate(certificate.id), null);
  } finally {
    getDb().close();
    globalThis.__repuhDb = undefined;
    rmSync(directory, { recursive: true, force: true });
  }
});
