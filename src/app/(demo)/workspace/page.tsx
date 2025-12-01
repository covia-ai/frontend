
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Separator } from "@/components/ui/separator";
import { ShowCase } from "@/components/ShowCase";
import { AIPrompt } from "@/components/AIPrompt";
export default function Workspace() {
  return (
    <ContentLayout>
      <AIPrompt/>
      <Separator/>
      <ShowCase/>
    </ContentLayout>
  );
}
