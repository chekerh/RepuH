/**
 * Seeds the labelled development network.
 *
 * The same function runs from instrumentation on first boot. This entry point
 * exists so a developer can seed a persisted database deliberately, and it is
 * safe to run repeatedly: seeding is skipped when any account already exists.
 */
import { seedDemoNetwork } from "../src/lib/demo/seed";

const created = seedDemoNetwork();

if (created > 0) {
  console.log(`[repuh] seeded ${created} labelled demo profiles.`);
} else {
  console.log(
    "[repuh] nothing seeded: demo mode is off, or the database already has accounts.",
  );
}
