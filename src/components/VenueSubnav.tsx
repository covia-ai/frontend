"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, Cable, LayoutDashboard, Package, ScrollText, Users, Wrench, Zap, type LucideIcon } from "lucide-react";
import { useVenues } from "@/hooks/use-venues";
import { venueDisplayName } from "@/lib/venue-display";
import { cn } from "@/lib/utils";

// The venue sections, in nav order. `route` is the path segment after the slug
// ("" = the landing/Overview). "Integrate" keeps the /connect route but reads
// as its own thing in the IA, distinct from the top-level /connections vault.
const SECTIONS: { key: string; label: string; route: string; Icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", route: "", Icon: LayoutDashboard },
  { key: "assets", label: "Assets", route: "assets", Icon: Package },
  { key: "operations", label: "Operations", route: "operations", Icon: Boxes },
  { key: "jobs", label: "Jobs", route: "jobs", Icon: ScrollText },
  { key: "adapters", label: "Adapters", route: "adapters", Icon: Cable },
  { key: "mcp", label: "MCP", route: "mcp", Icon: Wrench },
  { key: "users", label: "Users", route: "users", Icon: Users },
  { key: "connect", label: "Integrate", route: "connect", Icon: Zap },
];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// A scoped sub-nav across a venue's sections, rendered by TopBar on any
// /venues/<slug>/* route so you move within a venue without returning to its
// landing page. Self-hides everywhere else. Detail routes (assets/[id],
// operations/[...], jobs/[id]) keep their section highlighted.
export function VenueSubnav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["venues", <slug>, <section>?]
  const isVenueRoute = segments[0] === "venues" && segments.length >= 2;
  const slug = isVenueRoute ? segments[1] : "";
  const venueId = isVenueRoute ? safeDecode(slug) : "";

  // Called unconditionally (rules of hooks); returns "" off a venue route.
  const name = useVenues((s) => {
    if (!venueId) return "";
    const venue = s.venues.find((v) => v.venueId === venueId);
    return venue ? venueDisplayName(venue, venueId) : venueId;
  });

  if (!isVenueRoute) return null;
  const active = segments[2] ?? "overview";

  return (
    <nav aria-label="Venue sections" className="w-full overflow-x-auto border-b border-border bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-1 px-4">
        <span className="mr-1 flex items-center gap-1.5 whitespace-nowrap border-r border-border py-2.5 pr-3 text-sm font-semibold text-foreground">
          <Building2 size={15} className="shrink-0 text-secondary" />
          <span className="max-w-[10rem] truncate">{name || "Venue"}</span>
        </span>
        {SECTIONS.map(({ key, label, route, Icon }) => {
          const isActive = active === key;
          const href = `/venues/${slug}${route ? `/${route}` : ""}`;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
