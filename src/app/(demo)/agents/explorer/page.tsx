import { redirect } from "next/navigation";

// Folded into /agents/view (roster-first, with the explorer workbench as the
// ?agentId= drill-in). This route was a byte-for-byte duplicate; keep it as a
// redirect so any old link still lands in the right place.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;
  redirect(agentId ? `/agents/view?agentId=${encodeURIComponent(agentId)}` : "/agents/view");
}
