import { ContentLayout } from "@/components/admin-panel/content-layout";
import { AgentProfile } from "@/components/AgentProfile";

// The per-agent drill-in: a profile (identity header + Conversations / Timeline
// / Context / Settings tabs). Namespaced under /agents/agent/ so an agent id
// can never collide with the sibling nav routes. Breadcrumb → Home › Agents ›
// <name>.
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  // Next already percent-decodes dynamic route params. Decoding a second time
  // corrupts an id containing a literal "%20" and throws URIError on one
  // containing a bare "%", which from a Server Component renders the error
  // boundary instead of the agent.
  const { agentId } = await params;

  return (
    <ContentLayout>
      <AgentProfile agentId={agentId} />
    </ContentLayout>
  );
}
