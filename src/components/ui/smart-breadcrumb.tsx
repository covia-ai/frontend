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

export function SmartBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();

  // Generate breadcrumb items based on pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
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
        const label = getCustomLabel(segment, currentPath) || segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
                 breadcrumbs.push({
           label,
           href: currentPath,
         });
      }
    });

    return breadcrumbs;
  };

  // Custom label mapping for better UX
  const getCustomLabel = (segment: string, path: string): string | null => {
    const labelMap: Record<string, string> = {
      'demo': 'Demo',
      'venues': 'Venues',
      'assets': 'Assets',
      'operations': 'Operations',
      'history': 'History',
      'learning': 'Learning',
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