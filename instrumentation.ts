/**
 * Runs once when a Next.js server process starts. The only job here is the
 * development adapter: a labelled demo network so the product can be explored
 * without GitHub credentials. Disabled outside REPUH_DEMO_MODE.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { env } = await import("@/lib/env");
  if (!env.demoMode) return;

  const { seedDemoNetwork } = await import("@/lib/demo/seed");
  try {
    const created = seedDemoNetwork();
    if (created > 0) {
      console.info(`[repuh] development adapter seeded ${created} labelled demo profiles`);
    }
  } catch (error) {
    console.error("[repuh] development adapter failed to seed", error);
  }
}
