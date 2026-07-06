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

const COLLAPSE_THRESHOLD = 4;
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
  agentName?:string;
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
    const breadcrumbs: BreadcrumbItemType[] = [
      { label: 'Workspace', href: '/' }
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
    const knownRoutes = ['demo', 'publicartificats','venues', 'assets', 'operations', 'jobs', 'learning', 'workspace', 'myvenues', 'myassets', 'signup', 'privacypolicy'];
    return !knownRoutes.includes(segment) && !segment.startsWith('[') && !segment.endsWith(']');
  };

  // Check if a segment represents an venue (not a known route)
  const isVenueSegment = (segment: string, prevSegment: string): boolean => {
    const knownRoutes = ['demo', 'publicartificats','venues', 'assets', 'operations', 'jobs', 'learning', 'workspace', 'myvenues', 'myassets', 'signup', 'privacypolicy'];
    const isPrevSegmentVenues = prevSegment == "venues" ? true : false;
    return !knownRoutes.includes(segment) && !segment.startsWith('[') && !segment.endsWith(']') && isPrevSegmentVenues;
  };

  // Custom label mapping for better UX
  const getCustomLabel = (segment: string, _path: string): string | null => {
    const labelMap: Record<string, string> = {
      'demo': 'Demo',
      'venues': 'Venues',
      'assets': 'Assets',
      'publicartifacts': 'Public Artifacts',
      'privateartifacts': 'Private Artifacts',
      'operations': 'Operations',
      'jobs': 'Jobs',
      'learning': 'Learning Corner',
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

  const collapsed = breadcrumbs.length > COLLAPSE_THRESHOLD;
  const startCrumbs = collapsed ? breadcrumbs.slice(0, SHOW_START) : [];
  const hiddenCrumbs = collapsed ? breadcrumbs.slice(SHOW_START, breadcrumbs.length - SHOW_END) : [];
  const endCrumbs = collapsed ? breadcrumbs.slice(breadcrumbs.length - SHOW_END) : [];

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {!collapsed && breadcrumbs.map((item, index) => (
          <BreadcrumbItem key={index}>
            <BreadcrumbLink
              onClick={() => item.href && handleBreadcrumbClick(item.href)}
              className="cursor-pointer hover:underline"
            >
              {item.label}
            </BreadcrumbLink>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}

        {collapsed && (
          <>
            {startCrumbs.map((item, index) => (
              <BreadcrumbItem key={`s-${index}`}>
                <BreadcrumbLink
                  onClick={() => item.href && handleBreadcrumbClick(item.href)}
                  className="cursor-pointer hover:underline"
                >
                  {item.label}
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </BreadcrumbItem>
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
              <BreadcrumbSeparator />
            </BreadcrumbItem>

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
  );
}