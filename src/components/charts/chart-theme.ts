"use client";

import { useTheme } from "next-themes";

// Hex mirrors of the OKLCH tokens in globals.css, computed once so chart code
// never needs getComputedStyle — same "useTheme() branch to a literal per-mode
// value" pattern already used by ThemedJsonEditor.tsx's githubDarkTheme/
// githubLightTheme choice. Recomputing these from a config change is a
// find-and-check-globals.css job, not automatic — there's no live link.
export interface ChartColors {
  accent: string;
  deemphasis: string;
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  grid: string;
}

const CHART_COLORS: Record<"light" | "dark", ChartColors> = {
  light: {
    accent: "#6b46c1", // --primary
    deemphasis: "#1e2642", // --muted-foreground
    surface: "#f1f5f9", // --card (StatTile renders inside a Card)
    tooltipBg: "#ffffff", // --popover
    tooltipBorder: "#e2e8f0", // --border
    tooltipText: "#1e2642", // --popover-foreground
    grid: "#e2e8f0", // --border
  },
  dark: {
    accent: "#937be2", // --primary
    deemphasis: "#cac9c9", // --muted-foreground
    surface: "#262626", // --card
    tooltipBg: "#161616", // --popover
    tooltipBorder: "rgba(255, 255, 255, 0.1)", // --border (alpha-composited on white)
    tooltipText: "#fcfcfc", // --popover-foreground
    grid: "rgba(255, 255, 255, 0.1)",
  },
};

// resolvedTheme (not theme, which can be "system") so a system-theme reader
// gets the color actually rendered rather than an unresolved default.
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  return CHART_COLORS[resolvedTheme === "dark" ? "dark" : "light"];
}
