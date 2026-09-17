import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TypeTile } from "@/components/TypeTile";
import { VideoThumbnails } from "@/components/VideoThumbnails";
import { DiscordGlyph } from "@/components/adapter-glyphs";
import { ExternalLink, LibraryBig } from "lucide-react";
import type { IconCmp } from "@/lib/file-type-look";

// The two external resource destinations (community + docs). A small registry
// so adding one is a one-line entry; each renders as a real anchor rather than
// window.open, with a brand-tinted TypeTile.
const RESOURCE_LINKS: {
  title: string;
  sub: string;
  body: string;
  cta: string;
  href: string;
  Icon: IconCmp;
  tile: string;
  variant?: "default" | "secondary";
}[] = [
  {
    title: "Covia Labs Discord",
    sub: "Join our community",
    body: "Connect with the Covia community, get help, share ideas, and stay updated with the latest developments.",
    cta: "Join Discord Server",
    href: "https://discord.gg/fywdrKd8QT",
    Icon: DiscordGlyph,
    tile: "bg-primary/15 text-primary",
    variant: "default",
  },
  {
    title: "Covia Documentation",
    sub: "Learn and explore",
    body: "Comprehensive documentation, tutorials, API references, and guides to help you master Covia.",
    cta: "View Documentation",
    href: "https://docs.covia.ai",
    Icon: LibraryBig,
    tile: "bg-secondary/15 text-secondary",
    variant: "secondary",
  },
];

export default function ResourcesPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-2" size="sm" align="left" text="Learn &amp;" highlight="build" />
        <p className="mb-6 text-sm text-muted-foreground">
          Watch, read and connect: walkthrough videos, full documentation, and the Covia community, all in one place.
        </p>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watch</h2>
        <VideoThumbnails />

        <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Read &amp; connect
        </h2>
        <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
          {RESOURCE_LINKS.map((link) => (
            <Card key={link.href} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <TypeTile Icon={link.Icon} tile={link.tile} className="size-11 rounded-lg" iconSize={22} />
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {link.title}
                      <ExternalLink size={14} className="text-muted-foreground" aria-hidden="true" />
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{link.sub}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="text-sm text-muted-foreground">{link.body}</p>
                <Button asChild className="w-full" variant={link.variant}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`resource-link-${link.href}`}
                  >
                    {link.cta}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ContentLayout>
  );
}
