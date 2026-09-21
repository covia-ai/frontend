"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UcanIssuePanel } from "@/components/ucan/UcanIssuePanel";
import { UcanVerifyPanel } from "@/components/ucan/UcanVerifyPanel";

/**
 * The capability console. Verification is the everyday surface and is open to
 * everyone — a token is evidence, and "why was I denied?" should be answerable
 * without an account. Issuance sits behind its own gate on the second tab.
 */
export default function UcanPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-1" size="sm" align="left" text="Inspect and grant" highlight="capabilities" />
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          A UCAN says who may do what, to which resource. Paste one to see this
          venue&apos;s verdict on it — the same judgement enforcement makes when
          it allows or denies a request.
        </p>

        <Tabs defaultValue="verify" className="max-w-3xl">
          <TabsList>
            <TabsTrigger value="verify" data-testid="ucan-tab-verify">Verify</TabsTrigger>
            <TabsTrigger value="issue" data-testid="ucan-tab-issue">Issue</TabsTrigger>
          </TabsList>
          <TabsContent value="verify" className="mt-4">
            <UcanVerifyPanel />
          </TabsContent>
          <TabsContent value="issue" className="mt-4">
            <UcanIssuePanel />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
