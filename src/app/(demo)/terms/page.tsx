"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { TERMS_OF_SERVICE_MD } from "@/content/legal/terms";

export default function TermsPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Terms of" highlight="service" />
        <div className="max-w-3xl">
          <MarkdownMessage className="text-sm leading-relaxed">
            {TERMS_OF_SERVICE_MD}
          </MarkdownMessage>
        </div>
      </div>
    </ContentLayout>
  );
}
