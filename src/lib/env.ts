import path from "node:path";

function bool(value: string | undefined, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

const DEV_SECRET = "repuh-local-development-secret-change-me";

const appSecret = process.env.REPUH_APP_SECRET ?? DEV_SECRET;

export const env = {
  appSecret,
  appSecretIsFallback: appSecret === DEV_SECRET,
  isProduction: process.env.NODE_ENV === "production",
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"),
  databasePath: path.resolve(
    process.cwd(),
    process.env.REPUH_DATABASE_PATH ?? "./data/repuh.db",
  ),
  demoMode: bool(process.env.REPUH_DEMO_MODE, process.env.NODE_ENV !== "production"),
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    configured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  },
  cronSecret: process.env.REPUH_CRON_SECRET ?? "",
  hedera: {
    network: (process.env.HEDERA_NETWORK ?? "testnet") as "testnet" | "previewnet" | "mainnet",
    operatorId: process.env.HEDERA_OPERATOR_ID ?? "",
    operatorKey: process.env.HEDERA_OPERATOR_KEY ?? "",
    topicId: process.env.HEDERA_TOPIC_ID ?? "",
    /** Id of the deployed EvidenceAnchor contract (Hedera Smart Contract Service). */
    contractId: process.env.HEDERA_CONTRACT_ID ?? "",
    certificateContractId: process.env.HEDERA_CERTIFICATE_CONTRACT_ID ?? "",
    /** True when the consensus-service path (operator, key and topic) is present. */
    configured: Boolean(
      process.env.HEDERA_OPERATOR_ID &&
        process.env.HEDERA_OPERATOR_KEY &&
        process.env.HEDERA_TOPIC_ID,
    ),
  },
  /** Optional base64 PKCS#8 Ed25519 key for certificates; generated if absent. */
  certificateSigningKey: process.env.REPUH_CERT_SIGNING_KEY ?? "",
  /**
   * Comma-separated allowlist for the developer admin surface. An empty list
   * disables /admin entirely (it 404s) rather than opening it to every account.
   */
  adminEmails: (process.env.REPUH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  openaiKey: process.env.OPENAI_API_KEY ?? "",
} as const;

let warned = false;

export function assertSecretInProduction() {
  if (env.isProduction && env.appSecret === DEV_SECRET && !warned) {
    warned = true;
    throw new Error(
      "REPUH_APP_SECRET must be set in production. Refusing to start with the development fallback.",
    );
  }
}
