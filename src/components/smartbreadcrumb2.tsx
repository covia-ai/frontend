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
import { Fragment, useEffect, useRef, useState } from "react";

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
        breadcrumbs.push({
          label,
          href: currentPath,
        });
      }
    });

    return breadcrumbs;
  };

  // Check if a segment represents an asset (not a known route)
  const isAssetOrJobSegment = (segment: string): boolean => {
    const knownRoutes = ['demo', 'demos', 'sdk-job-lifecycle', 'adaptive-risk', 'governed-escalation', 'publicartificats','venues', 'assets', 'operations', 'jobs', 'learning', 'workspace', 'myvenues', 'myassets', 'signup', 'privacypolicy'];
    return !knownRoutes.includes(segment) && !segment.startsWith('[') && !segment.endsWith(']');
  };

  // Check if a segment represents an venue (not a known route)
  const isVenueSegment = (segment: string, prevSegment: string): boolean => {
    const knownRoutes = ['demo', 'demos', 'sdk-job-lifecycle', 'adaptive-risk', 'governed-escalation', 'publicartificats','venues', 'assets', 'operations', 'jobs', 'learning', 'workspace', 'myvenues', 'myassets', 'signup', 'privacypolicy'];
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
      'assets': 'Assets',
      'publicartifacts': 'Public Artifacts',
      'privateartifacts': 'Private Artifacts',
      'operations': 'Operations',
      'jobs': 'Jobs',
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
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    // Collapse before the trail actually hits the container's edge, leaving
    // headroom for other topbar controls that can still grow (e.g.
    // VenueSelector) without immediately forcing a re-collapse.
    const check = () => setOverflows(measure.scrollWidth > container.clientWidth * 0.8);
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

  // Collapsing only makes sense if there's something to hide behind the "…".
  const collapsed = overflows && breadcrumbs.length > SHOW_START + SHOW_END;
  const startCrumbs = collapsed ? breadcrumbs.slice(0, SHOW_START) : [];
  const hiddenCrumbs = collapsed ? breadcrumbs.slice(SHOW_START, breadcrumbs.length - SHOW_END) : [];
  const endCrumbs = collapsed ? breadcrumbs.slice(breadcrumbs.length - SHOW_END) : [];

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
        <BreadcrumbList className="flex-nowrap">
          {/* Separators are <li>s themselves — they must be siblings of
              BreadcrumbItem (also an <li>), never children: li-in-li is invalid
              HTML and breaks hydration. */}
          {!collapsed && breadcrumbs.map((item, index) => (
            <Fragment key={index}>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => item.href && handleBreadcrumbClick(item.href)}
                  className="cursor-pointer hover:underline"
                >
                  {item.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}

          {collapsed && (
            <>
              {startCrumbs.map((item, index) => (
                <Fragment key={`s-${index}`}>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => item.href && handleBreadcrumbClick(item.href)}
                      className="cursor-pointer hover:underline"
                    >
                      {item.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </Fragment>
              ))}

              <BreadcrumbItem>
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
              <BreadcrumbSeparator />

              {endCrumbs.map((item, index) => (
                <BreadcrumbItem key={`e-${index}`}>
                  <BreadcrumbLink
                    onClick={() => item.href && handleBreadcrumbClick(item.href)}
                    className="cursor-pointer hover:underline"
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