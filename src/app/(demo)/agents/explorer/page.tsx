import { redirect } from "next/navigation";

// Legacy duplicate route. Folded into /agents (roster) + /agents/agent/<id>
// (drill-in); redirect so old links still land right.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;
  redirect(agentId ? `/agents/agent/${encodeURIComponent(agentId)}` : "/agents");
}
