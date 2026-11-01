/**
 * Certificate signing keys.
 *
 * Certificates are signed with Ed25519. The public key is published at
 * /api/certificates/key, so a holder can verify a certificate offline without
 * asking this server.
 *
 * Key source, in order:
 *  1. REPUH_CERT_SIGNING_KEY — base64 PKCS#8 DER, for a deployment that stores
 *     the key in its secret manager.
 *  2. A key generated on first use and stored in `schema_meta`. This keeps the
 *     MVP self-contained; the private key lives in the same database as the
 *     records, which is a real limitation and is documented as one.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto";
import { env } from "@/lib/env";
import { getDb, nowIso } from "@/lib/db";

const PRIVATE_KEY_META = "certificate_signing_key_pkcs8";
const CREATED_META = "certificate_signing_key_created_at";

let cached: { privateKey: KeyObject; publicKey: KeyObject; keyId: string } | null = null;

function loadFromEnv(): KeyObject | null {
  if (!env.certificateSigningKey) return null;
  try {
    return createPrivateKey({
      key: Buffer.from(env.certificateSigningKey, "base64"),
      format: "der",
      type: "pkcs8",
    });
  } catch {
    return null;
  }
}

function loadFromDatabase(): KeyObject | null {
  const row = getDb()
    .prepare("SELECT value FROM schema_meta WHERE key = ?")
    .get(PRIVATE_KEY_META) as { value: string } | undefined;
  if (!row?.value) return null;
  try {
    return createPrivateKey({
      key: Buffer.from(row.value, "base64"),
      format: "der",
      type: "pkcs8",
    });
  } catch {
    return null;
  }
}

function persist(key: KeyObject) {
  const der = key.export({ format: "der", type: "pkcs8" });
  const db = getDb();
  const statement = db.prepare(
    "INSERT INTO schema_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  statement.run(PRIVATE_KEY_META, Buffer.from(der).toString("base64"));
  statement.run(CREATED_META, nowIso());
}

function keyIdFor(publicKey: KeyObject): string {
  const spki = publicKey.export({ format: "der", type: "spki" });
  return createHash("sha256").update(spki).digest("hex").slice(0, 16);
}

export function signingKey() {
  if (cached) return cached;

  let privateKey = loadFromEnv();
  if (!privateKey) privateKey = loadFromDatabase();
  if (!privateKey) {
    privateKey = generateKeyPairSync("ed25519").privateKey;
    persist(privateKey);
  }

  const publicKey = createPublicKey(privateKey);
  cached = { privateKey, publicKey, keyId: keyIdFor(publicKey) };
  return cached;
}

export interface PublishedKey {
  keyId: string;
  algorithm: "Ed25519";
  publicKeyJwk: JsonWebKey;
  createdAt: string | null;
  source: "environment" | "generated";
}

export function publishedKey(): PublishedKey {
  const { publicKey, keyId } = signingKey();
  const created = getDb()
    .prepare("SELECT value FROM schema_meta WHERE key = ?")
    .get(CREATED_META) as { value: string } | undefined;
  return {
    keyId,
    algorithm: "Ed25519",
    publicKeyJwk: publicKey.export({ format: "jwk" }) as JsonWebKey,
    createdAt: created?.value ?? null,
    source: env.certificateSigningKey ? "environment" : "generated",
  };
}

/** Test hook: allows tests to inject a fresh keypair without touching the DB. */
export function resetSigningKeyCacheForTests() {
  cached = null;
}
