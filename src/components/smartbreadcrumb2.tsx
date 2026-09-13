"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { humanizeAgentId } from "@/lib/agent-display";
import { cn } from "@/lib/utils";

// useLayoutEffect on the client (measure before paint so a too-wide trail never
// flashes), plain useEffect on the server (React warns otherwise, and there is
// no layout to measure during SSR).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// usePathname returns the encoded path, so a segment needs one decode — but an
// id containing a bare "%" makes decodeURIComponent throw, which would take the
// whole breadcrumb down with it. Fall back to the raw segment.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const SHOW_START = 2;
const SHOW_END = 1;

interface BreadcrumbItemType {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface SmartBreadcrumbProps {
  pathname: string;
  assetOrJobName?: string;
  venueName?: string;
  onNavigate?: (href: string) => void;
}

export function SmartBreadcrumb({
  pathname,
  assetOrJobName,
  venueName,
  onNavigate
}: SmartBreadcrumbProps) {

  // Generate breadcrumb items based on pathname
  const generateBreadcrumbs = (): BreadcrumbItemType[] => {
    const segments = pathname.split('/').filter(Boolean);
    // Home page itself — no "Workspace" crumb pointing at the page you're
    // already on.
    if (segments.length === 0) return [];
    const breadcrumbs: BreadcrumbItemType[] = [
      { label: 'Home', href: '/' }
    ];

    // Catalog addresses (e.g. "v/ops/covia/aggregate-lattice-entries") arrive
    // as path segments under both /operation/[...path] and
    // /venues/[slug]/operations/[...id]. Middle namespace segments aren't
    // pages of their own — skip them and jump from "Operations" to the
    // operation name.
    if (segments[0] === 'operation' && segments.length > 1) {
      return [
        ...breadcrumbs,
        { label: 'Operations', href: '/operations' },
        { label: operationLabel(segments), href: pathname },
      ];
    }

    if (
      segments[0] === 'venues' &&
      segments[2] === 'operations' &&
      segments.length > 3
    ) {
      const slug = segments[1];
      const venueLabel =
        venueName && isVenueSegment(slug, 'venues') ? venueName : slug;
      return [
        ...breadcrumbs,
        { label: 'Venues', href: '/venues' },
        { label: venueLabel, href: `/venues/${slug}` },
        { label: 'Operations', href: `/venues/${slug}/operations` },
        { label: operationLabel(segments), href: pathname },
      ];
    }

    // The agent drill-in lives at /agents/agent/<id> — "agent" is a routing
    // namespace, not a page of its own. Collapse it to Home › Agents › <name>.
    if (segments[0] === 'agents' && segments[1] === 'agent' && segments.length > 2) {
      return [
        ...breadcrumbs,
        { label: 'Agents', href: '/agents' },
        {
          label: humanizeAgentId(safeDecode(segments[segments.length - 1])),
          href: pathname,
        },
      ];
    }

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Handle dynamic segments (those with brackets)
      if (segment.startsWith('[') && segment.endsWith(']')) {
        // For dynamic segments, we'll show a generic label
        const dynamicType = segment.slice(1, -1); // Remove brackets
        breadcrumbs.push({
          label: dynamicType.charAt(0).toUpperCase() + dynamicType.slice(1),
          href: currentPath,
        });
      } else {
        // For regular segments, capitalize and format
        let label = getCustomLabel(segment, currentPath) || segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());

        // If this segment represent a venue DID, use the venue name instead
        if (venueName && isVenueSegment(segment, segments[index-1])) {
          label = venueName;
        }
        // If this is the last segment and we have an asset name or job name, use it instead
        else if (index === segments.length - 1 && assetOrJobName && isAssetOrJobSegment(segment)) {
          label = assetOrJobName;
        }
        // `/publicartifact/{hash}` and `/operation/{hash}` are singular
        // per-item detail routes — there's no page at the bare segment, so
        // their crumb must link to the actual list route instead of the
        // literal path so far.
        const listRouteOverrides: Record<string, string> = {
          publicartifact: '/publicartifacts',
          operation: '/operations',
          job: '/jobs',
        };
        const href = listRouteOverrides[segment] ?? currentPath;

        breadcrumbs.push({
          label,
          href,
        });
      }
    });

    return breadcrumbs;
  };

  const operationLabel = (segments: string[]): string => {
    const lastSegment = segments[segments.length - 1];
    if (assetOrJobName && isAssetOrJobSegment(lastSegment)) return assetOrJobName;
    return lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Check if a segment represents an asset (not a known route)
  const isAssetOrJobSegment = (segment: string): boolean => {
    const knownRoutes = ['demo', 'demos', 'sdk-job-lifecycle', 'adaptive-risk', 'governed-escalation', 'publicartificats','venues', 'assets', 'operations', 'jobs', 'job', 'learning', 'workspace', 'myvenues', 'myassets', 'signup', 'privacypolicy'];
    return !knownRoutes.includes(segment) && !segment.startsWith('[') && !segment.endsWith(']');
  };

  // Check if a segment represents an venue (not a known route)
  const isVenueSegment = (segment: string, prevSegment: string): boolean => {
    const knownRoutes = ['demo', 'demos', 'sdk-job-lifecycle', 'adaptive-risk', 'governed-escalation', 'publicartificats','venues', 'assets', 'operations', 'jobs', 'job', 'learning', 'workspace', 'myvenues', 'myassets', 'signup', 'privacypolicy'];
    const isPrevSegmentVenues = prevSegment == "venues" ? true : false;
    return !knownRoutes.includes(segment) && !segment.startsWith('[') && !segment.endsWith(']') && isPrevSegmentVenues;
  };

  // Custom label mapping for better UX
  const getCustomLabel = (segment: string, _path: string): string | null => {
    const labelMap: Record<string, string> = {
      'demo': 'Demo',
      'demos': 'Demos',
      'sdk-job-lifecycle': 'TypeScript SDK',
      'adaptive-risk': 'Adaptive Risk',
      'governed-escalation': 'Governed Escalation',
      'venues': 'Venues',
      // Matches the sidebar submenu label ("Public Artifacts", linking to
      // /publicartifacts) — the venue-scoped asset routes use a different
      // path segment ("assets") for the same concept, so without this the
      // breadcrumb read differently than the nav the user just clicked.
      'assets': 'Public Artifacts',
      'publicartifacts': 'Public Artifacts',
      'publicartifact': 'Public Artifacts',
      'privateartifacts': 'Private Artifacts',
      'operations': 'Operations',
      'operation': 'Operations',
      'jobs': 'Jobs',
      // Matches PublicArtifactViewer/PublicOperationViewer: the venue-less
      // job detail route uses a singular path segment ("job") for the same
      // concept as the "jobs" list route.
      'job': 'Jobs',
      'learning': 'Resources',
      'workspace': 'Workspace',
      'myvenues': 'My Venues',
      'myassets': 'My Assets',
      'signup': 'Sign Up',
      'privacypolicy': 'Privacy Policy',
    };

    return labelMap[segment] || null;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleBreadcrumbClick = (href: string) => onNavigate?.(href);

  // Whether the full, uncollapsed trail actually overflows the space this
  // component has been given — measured, not guessed from segment count.
  // Available width varies with sidebar state and the other topbar controls
  // (see TopBar.tsx), so a fixed crumb-count threshold either collapses a
  // short trail unnecessarily on a wide screen or lets a long one overflow
  // on a narrow one. Same ResizeObserver-on-a-ref idiom as
  // use-grid-page-size.ts, just measuring a hidden full-width copy against
  // this container instead of a grid.
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const [overflows, setOverflows] = useState(false);
  // How many leading crumbs to keep when collapsed. Progressively reduced (to 0)
  // until the collapsed trail actually fits the space it has, and reset to the
  // max whenever the trail or the available width changes so it can grow back.
  const [leadCap, setLeadCap] = useState(SHOW_START);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    // Collapse before the trail actually hits the container's edge, leaving
    // headroom for other topbar controls that can still grow (e.g.
    // VenueSelector) without immediately forcing a re-collapse.
    const check = () => {
      setOverflows(measure.scrollWidth > container.clientWidth * 0.8);
      // Re-fit the leading crumbs from the top: on any width/trail change,
      // try to show the most context again, then let the layout effect below
      // trim back down to what fits.
      setLeadCap(SHOW_START);
    };
    check();

    const ro = new ResizeObserver(check);
    ro.observe(container);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
    // Label lengths (and the count of crumbs) change the measured width, so
    // re-check whenever the trail itself changes, not just on resize.
  }, [pathname, assetOrJobName, venueName]);

  // When the full trail overflows, collapse the ancestors behind a "…". How many
  // leading crumbs stay is width-driven (leadCap), not a fixed count: on a
  // narrow topbar even a 5-crumb venue trail folds down to "… › <name>" so it
  // can't overrun the controls; on a wide one it keeps up to SHOW_START leading
  // crumbs for context (e.g. Home › Venues › … › <name>). The trailing crumb
  // truncates as the final safety.
  const rawStart = Math.max(0, breadcrumbs.length - SHOW_END - 1);
  const startCount = Math.min(leadCap, rawStart);
  const collapsed = overflows && breadcrumbs.length > SHOW_END;
  const startCrumbs = collapsed ? breadcrumbs.slice(0, startCount) : [];
  const hiddenCrumbs = collapsed ? breadcrumbs.slice(startCount, breadcrumbs.length - SHOW_END) : [];
  const endCrumbs = collapsed ? breadcrumbs.slice(breadcrumbs.length - SHOW_END) : [];

  // After layout, if the collapsed trail still overflows its container and a
  // leading crumb can still be dropped, drop one. This converges (the trailing
  // crumb truncates at the floor) and runs before paint, so no overflow flashes.
  useIsoLayoutEffect(() => {
    if (!collapsed) return;
    const container = containerRef.current;
    const list = listRef.current;
    if (!container || !list) return;
    if (list.scrollWidth > container.clientWidth + 1 && startCount > 0) {
      setLeadCap((c) => Math.max(0, c - 1));
    }
  });

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      {/* Hidden full-width render of the uncollapsed trail, purely to
          measure whether it would overflow — never shown, taken out of
          flow so it can't affect this container's own width. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="invisible absolute left-0 top-0 -z-10 flex items-center whitespace-nowrap"
      >
        {breadcrumbs.map((item, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              <BreadcrumbLink className="cursor-pointer hover:underline">
                {item.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </div>

      <Breadcrumb>
        <BreadcrumbList ref={listRef} className="min-w-0 flex-nowrap">
          {/* Separators are <li>s themselves — they must be siblings of
              BreadcrumbItem (also an <li>), never children: li-in-li is invalid
              HTML and breaks hydration. */}
          {!collapsed && breadcrumbs.map((item, index) => {
            // The trailing crumb (current page) can be a long asset/operation
            // name — it truncates with an ellipsis so it never wraps into a
            // second line or overruns the topbar controls; the short leading
            // crumbs keep their full width.
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Fragment key={index}>
                <BreadcrumbItem className={isLast ? "min-w-0" : "shrink-0"}>
                  <BreadcrumbLink
                    onClick={() => item.href && handleBreadcrumbClick(item.href)}
                    className={cn("cursor-pointer hover:underline", isLast ? "block min-w-0 truncate" : "whitespace-nowrap")}
                  >
                    {item.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator className="shrink-0" />}
              </Fragment>
            );
          })}

          {collapsed && (
            <>
              {startCrumbs.map((item, index) => (
                <Fragment key={`s-${index}`}>
                  <BreadcrumbItem className="shrink-0">
                    <BreadcrumbLink
                      onClick={() => item.href && handleBreadcrumbClick(item.href)}
                      className="cursor-pointer whitespace-nowrap hover:underline"
                    >
                      {item.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0" />
                </Fragment>
              ))}

              <BreadcrumbItem className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground">
                    <span>…</span>
                    <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {hiddenCrumbs.map((item, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onClick={() => item.href && handleBreadcrumbClick(item.href)}
                        className="cursor-pointer"
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0" />

              {endCrumbs.map((item, index) => (
                <BreadcrumbItem key={`e-${index}`} className="min-w-0">
                  <BreadcrumbLink
                    onClick={() => item.href && handleBreadcrumbClick(item.href)}
                    className="block min-w-0 cursor-pointer truncate hover:underline"
                  >
                    {item.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}