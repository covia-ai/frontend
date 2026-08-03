"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { HitlInbox } from "@/components/HitlInbox";
import { PageHeading } from "@/components/PageHeading";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function HitlPage() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Manage your" highlight="Inbox" />

        {isAuthenticated ? (
          <HitlInbox />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sign in to view requests awaiting your decision.
          </p>
        )}
      </div>
    </ContentLayout>
  );
}
