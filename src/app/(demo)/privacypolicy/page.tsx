"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { PRIVACY_POLICY_MD } from "@/content/legal/privacy";

export default function PrivacyPolicyPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Privacy" highlight="policy" />
        <div className="max-w-3xl">
          <MarkdownMessage className="text-sm leading-relaxed">
            {PRIVACY_POLICY_MD}
          </MarkdownMessage>
        </div>
      </div>
    </ContentLayout>
  );
}
