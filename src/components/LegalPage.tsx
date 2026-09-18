import type { ReactNode } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { MarkdownMessage } from "@/components/MarkdownMessage";

interface LegalPageProps {
  /** PageHeading pieces: plain lead text and the highlighted tail. */
  text: string;
  highlight: string;
  /** The document body — a markdown string constant. */
  markdown: string;
  /** Extra content below the document, e.g. the cookie-preferences block. */
  children?: ReactNode;
}

// The shared shell for the legal pages (Terms, Privacy). Both used the same
// ContentLayout / TopBar / PageHeading / MarkdownMessage scaffold; this removes
// the duplication so the legal chrome lives in one place (Wave 5C). The
// effective-date / version line is part of each document's markdown, so there
// is no separate "last updated" stamp that could drift out of sync.
export function LegalPage({ text, highlight, markdown, children }: LegalPageProps) {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text={text} highlight={highlight} />
        <div className="max-w-3xl">
          <MarkdownMessage className="text-sm leading-relaxed">{markdown}</MarkdownMessage>
          {children}
        </div>
      </div>
    </ContentLayout>
  );
}
