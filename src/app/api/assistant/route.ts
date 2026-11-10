import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import {
  assertSameOrigin,
  clientKey,
  fail,
  ok,
  parseBody,
  rateLimit,
  rateLimited,
} from "@/lib/http";
import { isMutating, planCommand } from "@/lib/assistant/router";
import { confirmationFor, respond, unknownReply } from "@/lib/assistant/service";
import type { Reply } from "@/lib/assistant/types";

export const dynamic = "force-dynamic";

const commandSchema = z.object({
  command: z.string().trim().min(1).max(280),
  confirmed: z.boolean().optional(),
});

/**
 * One entry point for the assistant. The route resolves the actor, validates,
 * rate limits, and delegates: intent parsing lives in router.ts, answers and
 * mutations in service.ts.
 */
export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }

  const user = await currentUser();
  if (!user) return fail("unauthorized", "Sign in again to use the assistant.", 401);

  if (!rateLimit(`assistant:${await clientKey("assistant")}:${user.id}`, 30, 60_000)) {
    return rateLimited();
  }

  const { data, error } = await parseBody(request, commandSchema);
  if (error) return error;

  const plan = planCommand(data.command);
  if (!plan) return ok<Reply>(unknownReply(data.command));

  if (isMutating(plan) && !data.confirmed) {
    const card = confirmationFor(plan);
    return ok<Reply>({
      text: "This changes your account. Confirm before it runs.",
      cards: card ? [card] : undefined,
    });
  }

  try {
    return ok<Reply>(respond(user.id, plan));
  } catch {
    // No stack traces, payloads or identifiers in a response.
    return ok<Reply>({
      error: true,
      text: "That request failed before it changed anything. Try again in a moment.",
    });
  }
}
