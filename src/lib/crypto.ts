import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/lib/env";

const KEY_LENGTH = 32;
const SCRYPT_COST = 16384;

function deriveKey(purpose: string) {
  return scryptSync(env.appSecret, `repuh:${purpose}`, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: 8,
    p: 1,
  });
}

/* ---------------------------------------------------------------- passwords */

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: SCRYPT_COST,
    r: 8,
    p: 1,
  });
  return `scrypt$${SCRYPT_COST}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, cost, salt, digest] = stored.split("$");
    if (scheme !== "scrypt" || !cost || !salt || !digest) return false;
    const expected = Buffer.from(digest, "base64");
    const actual = scryptSync(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
      N: Number(cost),
      r: 8,
      p: 1,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ tokens */

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/* ------------------------------------------------------- provider secrets */

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("provider-token"), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [version, iv, tag, data] = payload.split(".");
    if (version !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey("provider-token"),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
