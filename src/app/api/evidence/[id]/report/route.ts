import { z } from "zod";
import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getEvidence, markEvidenceDisputed } from "@/lib/db/queries";
import { audit } from "@/lib/db";

const reportSchema = z.object({
  reason: z.enum(["incorrect_attribution", "not_my_work", "misclassified_skill", "outdated", "other"]),
  detail: z.string().trim().max(1000).optional().default(""),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const { id } = await params;
  const evidence = getEvidence(user.id, id);
  if (!evidence) return fail("not_found", "No evidence item with that id.", 404);

  const { data, error } = await parseBody(request, reportSchema);
  if (error) return error;

  markEvidenceDisputed(user.id, id);
  audit({
    userId: user.id,
    action: "evidence.reported",
    target: id,
    metadata: { reason: data.reason, detail: data.detail },
  });

  return ok({
    reported: true,
    verificationState: "disputed",
    message:
      "Marked as disputed. The item stays visible to you but is excluded from public projections until reviewed.",
  });
}
