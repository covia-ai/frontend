"use client";

import { ComponentType, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TrendPoint } from "@/components/charts/Sparkline";

// recharts is ~100 KB gzip (#476) and only the trend line needs it, so load it
// with the first tile that has one rather than with every page using StatTile.
// The placeholder holds the line's height so the tile doesn't grow when it lands.
const Sparkline = lazy(() =>
  import("@/components/charts/Sparkline").then((m) => ({ default: m.Sparkline })),
);

const SPARKLINE_HEIGHT = 28;

interface StatTileProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  caption?: string;
  iconClassName?: string;
  trend?: {
    data: TrendPoint[];
    formatValue: (value: number) => string;
  };
}

// Headline-number tile (label + big value + small caption), with an optional
// trend sparkline below — covia-ai/frontend#225. Callers that don't pass
// `trend` render exactly as before.
export function StatTile({ icon: Icon, label, value, caption, iconClassName, trend }: StatTileProps) {
  return (
    <Card className="p-4 gap-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon size={16} className={cn("shrink-0", iconClassName ?? "text-primary")} />
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
      {trend && (
        <Suspense fallback={<div aria-hidden style={{ height: SPARKLINE_HEIGHT }} />}>
          <Sparkline
            data={trend.data}
            formatValue={trend.formatValue}
            height={SPARKLINE_HEIGHT}
            ariaLabel={`${label} trend`}
          />
        </Suspense>
      )}
    </Card>
  );
}
