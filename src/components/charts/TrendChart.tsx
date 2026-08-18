"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { useChartColors } from "./chart-theme";
import { ChartTooltip } from "./ChartTooltip";
import type { TrendPoint } from "./Sparkline";

export interface TrendChartSeries {
  label: string;
  data: TrendPoint[];
}

interface TrendChartProps {
  variant: "line" | "bar";
  series: TrendChartSeries;
  formatValue: (value: number) => string;
  height?: number;
  /** Hides axes/grid and shrinks margins for a sparkline-adjacent embed. */
  compact?: boolean;
}

// The general-purpose "one bar/line primitive" — standard chart chrome
// (grid, axes, tooltip), single accent-hue series. Foundation-only in Wave 1:
// no consumer yet (Wave 2's token/cost dashboards are the intended one).
export function TrendChart({ variant, series, formatValue, height = 200, compact = false }: TrendChartProps) {
  const colors = useChartColors();
  const margin = compact
    ? { top: 4, right: 4, bottom: 4, left: 4 }
    : { top: 8, right: 16, bottom: 8, left: 8 };

  const shared = (
    <>
      {!compact && (
        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
      )}
      {!compact && (
        <XAxis
          dataKey="label"
          tick={{ fill: colors.deemphasis, fontSize: 11 }}
          axisLine={{ stroke: colors.grid }}
          tickLine={false}
        />
      )}
      {!compact && (
        <YAxis
          tick={{ fill: colors.deemphasis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
      )}
      <Tooltip
        content={(props) => <ChartTooltip {...props} formatValue={formatValue} />}
        cursor={variant === "bar" ? { fill: colors.grid } : { stroke: colors.grid }}
      />
    </>
  );

  return (
    <div role="img" aria-label={`${series.label} trend`} style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={series.data} margin={margin}>
            {shared}
            <Bar dataKey="value" fill={colors.accent} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={series.data} margin={margin}>
            {shared}
            <Line
              dataKey="value"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
