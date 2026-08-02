import type { ComponentType } from "react";
import { JobLifecycleDemo } from "@/components/JobLifecycleDemo";
import { AdaptiveRiskDemo } from "@/components/adaptive-risk/AdaptiveRiskDemo";

// The demo registry. /demos lists these entries and /demos/[slug] renders
// them, so adding a demo is adding an entry here (plus, optionally, a
// breadcrumb label in smartbreadcrumb2's labelMap — the crumb falls back to
// the raw slug without one).
export type DemoEntry = {
  slug: string;
  /** PageHeading pieces: plain lead text and the highlighted tail. */
  title: { text: string; highlight: string };
  /** One-line description shown under the heading and on the index card. */
  blurb: string;
  Component: ComponentType;
};

export const DEMOS: DemoEntry[] = [
  {
    slug: "sdk-job-lifecycle",
    title: { text: "Run a job with the", highlight: "TypeScript SDK" },
    blurb: "A live walkthrough of how the SDK executes work on a venue.",
    Component: JobLifecycleDemo,
  },
  {
    slug: "adaptive-risk",
    title: { text: "Adaptive", highlight: "Risk" },
    blurb:
      "Three agents, one policy gate: fraud and credit joined at the execution layer, with refusal, escalation and reconstruction on the record.",
    Component: AdaptiveRiskDemo,
  },
];

export function demoBySlug(slug: string): DemoEntry | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}
