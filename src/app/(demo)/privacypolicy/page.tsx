"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { PRIVACY_POLICY_MD } from "@/content/legal/privacy";
import { Button } from "@/components/ui/button";
import { openConsentPreferences } from "@/lib/consent";

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
          {/*
            The withdrawal route the policy promises. Consent has to be as easy
            to take back as it was to give, so the preferences drawer needs a
            durable home rather than only appearing on first visit.
          */}
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="mb-2 text-sm font-semibold">Cookie preferences</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Change what this app is allowed to measure. Declining analytics
              stops Google Analytics and PostHog from loading at all.
            </p>
            <Button size="sm" variant="outline" onClick={openConsentPreferences}>
              Manage cookie preferences
            </Button>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}
