"use client";

import { useSearchParams } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { FilesExplorer } from "@/components/FilesExplorer";
import { PageHeading } from "@/components/PageHeading";

export default function FilesPage() {
  // ?drive=&path= deep-link here — read once at mount, see
  // use-files-explorer's initialDrive/initialPath handling.
  const params = useSearchParams();
  const initialDrive = params.get("drive") ?? undefined;
  const initialPath = params.get("path") ?? undefined;

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Browse your" highlight="Files" />

        <FilesExplorer initialDrive={initialDrive} initialPath={initialPath} />
      </div>
    </ContentLayout>
  );
}
