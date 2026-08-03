import { notFound } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { demoBySlug } from "@/lib/demos";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const demo = demoBySlug(slug);
  if (!demo) notFound();

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading
          className="mb-2"
          size="sm"
          align="left"
          text={demo.title.text}
          highlight={demo.title.highlight}
        />
        <p className="text-sm text-muted-foreground mb-6">{demo.blurb}</p>
        <demo.Component />
      </div>
    </ContentLayout>
  );
}
