"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ConnectionsList } from "@/components/ConnectionsList";
import { PageHeading } from "@/components/PageHeading";

export default function ConnectionsPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading
          className="mb-1"
          size="sm"
          align="left"
          text="Your"
          highlight="connections"
        />
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Link the services your agents can use. You supply the token; it is stored
          encrypted on your venue and referenced only by name — no OAuth broker, no
          data routed through Covia.
        </p>

        <ConnectionsList />
      </div>
    </ContentLayout>
  );
}
