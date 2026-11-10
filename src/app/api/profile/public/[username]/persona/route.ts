import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";
import { getProfileByUsername } from "@/lib/db/queries";
import { buildPersonaManifest, renderPersonaMarkdown } from "@/lib/persona";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = getProfileByUsername(username);
  if (!profile) {
    return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
  }

  const viewer = await currentUser();
  const isOwner = viewer?.id === profile.userId;
  if (profile.visibility === "private" && !isOwner) {
    return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
  }

  const manifest = buildPersonaManifest(username);
  if (!manifest) {
    return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
  }

  const markdown = renderPersonaMarkdown(manifest);
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${profile.username}.persona.md"`,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
