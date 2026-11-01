import { fail, ok, parseBody } from "@/lib/http";
import { userFromRequest } from "@/lib/auth/request";
import { activeConsent } from "@/lib/db";
import { ingestEvent } from "@/lib/services/ingest";
import { extensionEventSchema } from "@/lib/validation/schemas";

const ALLOWED_SUFFIXES = [
  "developer.mozilla.org",
  "docs.github.com",
  "github.com",
  "nextjs.org",
  "react.dev",
  "typescriptlang.org",
  "nodejs.org",
  "postgresql.org",
  "supabase.com",
  "threejs.org",
];

function allowed(domain: string) {
  return ALLOWED_SUFFIXES.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`));
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return fail("unauthorized", "Pair the extension from your RepuH account.", 401);

  if (!activeConsent(user.id, "browser_observation")) {
    return fail(
      "consent_required",
      "Browser observation is not enabled. Grant it in Settings → Observation before sending events.",
      403,
    );
  }

  const { data, error } = await parseBody(request, extensionEventSchema);
  if (error) return error;

  let accepted = 0;
  let rejected = 0;
  for (const event of data.events) {
    if (!allowed(event.domain)) {
      rejected += 1;
      continue;
    }
    const result = ingestEvent(
      user.id,
      {
        source: "extension",
        eventType: "website_session_observed",
        externalId: event.externalId,
        occurredAt: event.occurredAt,
        projectReference: `browser:${event.domain}`,
        attribution: "self",
        payload: {
          domain: event.domain,
          title: event.title ?? `Session on ${event.domain}`,
          durationSeconds: event.durationSeconds ?? 0,
        },
      },
      { privacy: "private" },
    );
    if (result.created) accepted += 1;
  }

  return ok({
    accepted,
    rejected,
    note:
      rejected > 0
        ? "Some events were outside the allowlist and were discarded."
        : "Only allowlisted documentation domains are recorded.",
  });
}
