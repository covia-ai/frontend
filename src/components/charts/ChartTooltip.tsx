"use client";

import type { TooltipContentProps } from "recharts";
import { useChartColors } from "./chart-theme";

interface ChartTooltipProps extends Partial<TooltipContentProps> {
  formatValue: (value: number) => string;
}

// Shared custom Tooltip content for every chart primitive in this folder —
// styling defined once so Sparkline and TrendChart read as one system, and
// every interactive line/area chart ships the dataviz skill's mandatory
// hover layer without re-implementing it per component.
export function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  const colors = useChartColors();
  const value = payload?.[0]?.value;
  if (!active || typeof value !== "number") return null;

  return (
    <div
      className="rounded-md px-2.5 py-1.5 text-xs shadow-sm"
      style={{
        backgroundColor: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        color: colors.tooltipText,
      }}
    >
      {label != null && <div className="text-[10px] opacity-70">{label}</div>}
      <div className="font-medium">{formatValue(value)}</div>
    </div>
  );
}
