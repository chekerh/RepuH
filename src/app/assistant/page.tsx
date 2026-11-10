import { Chrome } from "@/components/chrome";
import { AssistantWorkspace } from "@/components/assistant/workspace";
import { loadWorkspace } from "@/lib/assistant/service";
import { requireOnboarded } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assistant",
  description: "Ask for a section or a summary. Answers are computed from your evidence.",
};

export default async function AssistantPage() {
  const user = await requireOnboarded("/assistant");
  const initial = loadWorkspace(user);

  return (
    <Chrome>
      <AssistantWorkspace initial={initial} />
    </Chrome>
  );
}
