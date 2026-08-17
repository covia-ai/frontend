"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MyAssetList } from "@/components/MyAssetList";
import { PageHeading } from "@/components/PageHeading";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function MyArtifactsPage() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Your own" highlight="Artifacts" />

        {isAuthenticated ? (
          <MyAssetList />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sign in to view assets you&apos;ve created or pinned.
          </p>
        )}
      </div>
    </ContentLayout>
  );
}
