"use client";

import { useState } from "react";
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
  const getCustomLabel = (segment: string, path: string): string | null => {
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
  
  const handleBreadcrumbClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    }
    setExpandedIndex(null);
  };

  const handleEllipsisClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Determine which breadcrumbs to show on small screens
  const getVisibleBreadcrumbs = () => {
    if (breadcrumbs.length <= 2) {
      return breadcrumbs.map((item, index) => ({ item, index, isHidden: false }));
    }

    // On small screens, show last 2 items, or 1 expanded item + last item
    const result = breadcrumbs.map((item, index) => {
      const isLastTwo = index >= breadcrumbs.length - 2;
      const isExpanded = expandedIndex !== null && index === expandedIndex;
      const isLast = index === breadcrumbs.length - 1;
      
      return {
        item,
        index,
        isHidden: !isLastTwo && !isExpanded,
        showAsExpanded: isExpanded && !isLast
      };
    });

    return result;
  };

  const visibleBreadcrumbs = getVisibleBreadcrumbs();
  const hiddenBreadcrumbs = breadcrumbs.filter((_, index) => 
    index < breadcrumbs.length - 2 && index !== expandedIndex
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Desktop view - show all breadcrumbs */}
        <div className="hidden lg:contents">
          {breadcrumbs.map((item, index) => (
            <BreadcrumbItem key={`desktop-${index}`}>
              <BreadcrumbLink 
                onClick={() => item.href && handleBreadcrumbClick(item.href)}
                className="cursor-pointer hover:underline"
              >
                {item.label}
              </BreadcrumbLink>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </BreadcrumbItem>
          ))}
        </div>

        {/* Mobile view - show last 2 or expanded item */}
        <div className="lg:hidden contents">
          {breadcrumbs.length > 2 && hiddenBreadcrumbs.length > 0 && (
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 cursor-pointer hover:underline">
                  <span>...</span>
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hiddenBreadcrumbs.map((item, idx) => {
                    const originalIndex = breadcrumbs.findIndex(b => b === item);
                    return (
                      <DropdownMenuItem
                        key={`hidden-${idx}`}
                        onClick={() => handleEllipsisClick(originalIndex)}
                        className="cursor-pointer"
                      >
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
          )}

          {visibleBreadcrumbs.map(({ item, index, isHidden, showAsExpanded }) => {
            if (isHidden) return null;

            return (
              <BreadcrumbItem key={`mobile-${index}`}>
                <BreadcrumbLink 
                  onClick={() => item.href && handleBreadcrumbClick(item.href)}
                  className="cursor-pointer hover:underline"
                >
                  {item.label}
                </BreadcrumbLink>
                {(showAsExpanded || index < breadcrumbs.length - 1) && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            );
          })}
        </div>
      </BreadcrumbList>
    </Breadcrumb>
  );
}