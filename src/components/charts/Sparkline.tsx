"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { DotItemDotProps } from "recharts";
import { useChartColors } from "./chart-theme";
import { ChartTooltip } from "./ChartTooltip";

export interface TrendPoint {
  label: string;
  value: number | null;
}

interface SparklineProps {
  data: TrendPoint[];
  formatValue: (value: number) => string;
  height?: number;
  ariaLabel: string;
}

// The StatTile trend primitive — a compact, axis-free line reading "recent
// history, current value" at a glance. Mark spec follows the dataviz skill's
// stat-tile contract: a 2px de-emphasis-hue line (the history) with the last
// point alone rendered as an accent-colored end-dot (the current value) —
// no legend needed since the tile's own label already names the series.
export function Sparkline({ data, formatValue, height = 28, ariaLabel }: SparklineProps) {
  const colors = useChartColors();
  const lastIndex = data.length - 1;

  return (
    <div role="img" aria-label={ariaLabel} style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Tooltip
            content={(props) => <ChartTooltip {...props} formatValue={formatValue} />}
            cursor={false}
          />
          <Line
            dataKey="value"
            stroke={colors.deemphasis}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            isAnimationActive={false}
            dot={(dotProps: DotItemDotProps) => {
              if (dotProps.index !== lastIndex || dotProps.value == null) return null;
              return (
                <circle
                  key="current"
                  cx={dotProps.cx}
                  cy={dotProps.cy}
                  r={4}
                  fill={colors.accent}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 3, fill: colors.accent, stroke: colors.surface, strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
