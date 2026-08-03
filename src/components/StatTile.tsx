"use client";

import { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  caption?: string;
  iconClassName?: string;
}

// Headline-number tile (label + big value + small caption) — no delta/sparkline
// yet since these read over a recent window, not a clean prior-period baseline.
export function StatTile({ icon: Icon, label, value, caption, iconClassName }: StatTileProps) {
  return (
    <Card className="p-4 gap-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon size={16} className={cn("shrink-0", iconClassName ?? "text-primary")} />
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
    </Card>
  );
}
