import { redirect } from "next/navigation";

// Legacy route. The roster now lives at /agents and the drill-in at
// /agents/agent/<id>; redirect so old links/bookmarks still land right.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;
  redirect(agentId ? `/agents/agent/${encodeURIComponent(agentId)}` : "/agents");
}
