"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface SmartBreadcrumbProps {
  assetOrJobName?: string;
}

export function SmartBreadcrumb({ assetOrJobName }: SmartBreadcrumbProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

  // Generate breadcrumb items based on pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
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
        // If this is the last segment and we have an asset name or job name, use it instead
        if (index === segments.length - 1 && assetOrJobName && isAssetOrJobSegment(segment)) {
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
    router.push(href);
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
                 {breadcrumbs.map((item, index) => (
           <BreadcrumbItem key={index}>
             <BreadcrumbLink 
               asChild
               onClick={() => item.href && handleBreadcrumbClick(item.href)}
               className="cursor-pointer hover:underline"
             >
               <span>{item.label}</span>
             </BreadcrumbLink>
             {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
           </BreadcrumbItem>
         ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
} 