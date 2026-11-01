import { assertSameOrigin, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getEvidence, markEvidenceDisputed, updateEvidenceVisibility } from "@/lib/db/queries";
import { visibilitySchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const evidence = getEvidence(user.id, id);
  if (!evidence) return fail("not_found", "No evidence item with that id.", 404);
  return ok({ evidence });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = visibilitySchema.safeParse(body);
  if (!parsed.success) return fail("validation_failed", "Unknown visibility value.", 422);

  const updated = updateEvidenceVisibility(user.id, id, parsed.data.visibility);
  if (!updated) return fail("not_found", "No evidence item with that id.", 404);

  audit({
    userId: user.id,
    action: "evidence.visibility",
    target: id,
    metadata: { visibility: parsed.data.visibility },
  });
  return ok({ evidence: getEvidence(user.id, id) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  return fail(
    "not_supported",
    `Evidence ${id} is immutable by design. Report it for correction instead.`,
    405,
  );
}
