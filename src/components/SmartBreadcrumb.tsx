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
import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildBreadcrumbs, type Crumb } from "@/lib/breadcrumbs";
import { cn } from "@/lib/utils";

// useLayoutEffect on the client (measure before paint so a too-wide trail never
// flashes), plain useEffect on the server (React warns otherwise, and there is
// no layout to measure during SSR).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SHOW_START = 2;
const SHOW_END = 1;

interface SmartBreadcrumbProps {
  pathname: string;
  assetOrJobName?: string;
  venueName?: string;
}

// A real link, so crumbs are keyboard-focusable, open in a new tab and
// prefetch like the rest of the navigation.
function CrumbLink({ crumb, current, className }: { crumb: Crumb; current?: boolean; className?: string }) {
  return (
    <BreadcrumbLink asChild className={cn("hover:underline", className)}>
      <Link href={crumb.href} aria-current={current ? "page" : undefined}>
        {crumb.label}
      </Link>
    </BreadcrumbLink>
  );
}

export function SmartBreadcrumb({ pathname, assetOrJobName, venueName }: SmartBreadcrumbProps) {
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(pathname, { assetOrJobName, venueName }),
    [pathname, assetOrJobName, venueName],
  );

  // Whether the full, uncollapsed trail actually overflows the space this
  // component has been given — measured, not guessed from segment count.
  // Available width varies with sidebar state and the other topbar controls
  // (see TopBar.tsx), so a fixed crumb-count threshold either collapses a
  // short trail unnecessarily on a wide screen or lets a long one overflow
  // on a narrow one. A hidden full-width copy is measured against this
  // container.
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
  }, [breadcrumbs]);

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
    <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden">
      {/* overflow-hidden clips the absolutely-positioned full-width measure copy
          below so it can't inflate the page's horizontal scroll width; the
          measurement reads that element's own scrollWidth, unaffected by the clip. */}
      {/* Hidden full-width render of the uncollapsed trail, purely to
          measure whether it would overflow — never shown, taken out of
          flow so it can't affect this container's own width. Plain anchors
          without href, so nothing in it is focusable. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="invisible absolute left-0 top-0 -z-10 flex items-center whitespace-nowrap"
      >
        {breadcrumbs.map((item, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              <BreadcrumbLink>{item.label}</BreadcrumbLink>
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
                  <CrumbLink
                    crumb={item}
                    current={isLast}
                    className={isLast ? "block min-w-0 truncate" : "whitespace-nowrap"}
                  />
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator className="shrink-0" />}
              </Fragment>
            );
          })}

          {collapsed && (
            <>
              {startCrumbs.map((item, index) => (
                <Fragment key={`s-${index}`}>
                  <BreadcrumbItem className="shrink-0">
                    <CrumbLink crumb={item} className="whitespace-nowrap" />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0" />
                </Fragment>
              ))}

              <BreadcrumbItem className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Show hidden breadcrumbs"
                    className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <span>…</span>
                    <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {hiddenCrumbs.map((item, idx) => (
                      <DropdownMenuItem key={idx} asChild className="cursor-pointer">
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0" />

              {endCrumbs.map((item, index) => (
                <BreadcrumbItem key={`e-${index}`} className="min-w-0">
                  <CrumbLink crumb={item} current className="block min-w-0 truncate" />
                </BreadcrumbItem>
              ))}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
