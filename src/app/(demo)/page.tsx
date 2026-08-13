
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { DefaultAssistantHome } from "@/components/DefaultAssistantHome";
import { TopBar } from "@/components/admin-panel/TopBar";

export default function Home() {
  return (
    <ContentLayout>
      <TopBar/>
      <DefaultAssistantHome />
    </ContentLayout>
  );
}
