import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMOS } from "@/lib/demos";

export default function DemosPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading
          className="mb-2"
          size="sm"
          align="left"
          text="Guided"
          highlight="demos"
        />
        <p className="text-sm text-muted-foreground mb-6">
          Live walkthroughs that run real jobs on the venue you have selected.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
          {DEMOS.map((demo) => (
            <Link
              key={demo.slug}
              href={`/demos/${demo.slug}`}
              data-testid={`demo-card-${demo.slug}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {demo.title.text} {demo.title.highlight}
                    <ArrowRight
                      className="size-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{demo.blurb}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ContentLayout>
  );
}
