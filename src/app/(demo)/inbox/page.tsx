"use client";

import { useSearchParams } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { HitlInbox } from "@/components/HitlInbox";
import { PageHeading } from "@/components/PageHeading";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function HitlPage() {
  const isAuthenticated = useIsAuthenticated();
  // Deep link target, e.g. /inbox?requestId=<id> — same pattern as
  // /agents/chat?agentId=…
  const params = useSearchParams();
  const requestId = params.get("requestId") ?? undefined;
  // /inbox?agent=<id> — the agent roster's "Waiting on you" link (#364).
  const agent = params.get("agent") ?? undefined;

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Manage your" highlight="Inbox" />

        {isAuthenticated ? (
          <HitlInbox initialRequestId={requestId} initialAgent={agent} />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sign in to view requests awaiting your decision.
          </p>
        )}
      </div>
    </ContentLayout>
  );
}
