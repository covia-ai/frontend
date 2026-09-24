import { humanizeAgentId } from "@/lib/agent-display";

export type Crumb = { label: string; href: string };

const DOCS = {
  jobs: "https://docs.covia.ai/docs/user-guide/api#jobs",
  agents: "https://docs.covia.ai/docs/user-guide/agents",
  operations: "https://docs.covia.ai/docs/user-guide/adapters",
  assets: "https://docs.covia.ai/docs/user-guide/api#assets",
  venues: "https://docs.covia.ai/docs/overview/venues",
};

// What the chrome needs to know about a path segment. Only segments that need
// something listed here: any other segment is labelled by title-casing it, so
// a new route needs no entry unless its name reads wrongly that way.
//  - `listHref`: singular detail routes (/job/<id>) have no page at the bare
//    segment, so their crumb links to the list route instead.
const SEGMENTS: Record<string, { label?: string; listHref?: string; docs?: string }> = {
  venues: { docs: DOCS.venues },
  // Matches the sidebar label ("Public Artifacts", linking to
  // /publicartifacts): the venue-scoped routes use a different segment
  // ("assets") for the same concept.
  assets: { label: "Public Artifacts", docs: DOCS.assets },
  publicartifacts: { label: "Public Artifacts", docs: DOCS.assets },
  publicartifact: { label: "Public Artifacts", listHref: "/publicartifacts", docs: DOCS.assets },
  myartifacts: { label: "My Artifacts" },
  operations: { docs: DOCS.operations },
  operation: { label: "Operations", listHref: "/operations", docs: DOCS.operations },
  jobs: { docs: DOCS.jobs },
  job: { label: "Jobs", listHref: "/jobs", docs: DOCS.jobs },
  agents: { docs: DOCS.agents },
  // The venue integration page keeps the /connect route but is labelled
  // "Integrate" everywhere in the IA (Wave 4F).
  connect: { label: "Integrate" },
  mcp: { label: "MCP" },
  learning: { label: "Resources" },
  privacypolicy: { label: "Privacy Policy" },
  "sdk-job-lifecycle": { label: "TypeScript SDK" },
};

// The segment after one of these is an id, not a route: it takes the name the
// page supplies (asset, job or venue name) once that has loaded.
const ID_PARENTS = new Set(["venues", "assets", "jobs", "job", "publicartifact"]);

const titleCase = (segment: string) =>
  segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

// usePathname returns the encoded path, so a segment needs one decode — but an
// id containing a bare "%" makes decodeURIComponent throw, which would take the
// whole breadcrumb down with it. Fall back to the raw segment.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function buildBreadcrumbs(
  pathname: string,
  names: { assetOrJobName?: string; venueName?: string } = {},
): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  // Home itself gets no trail — a lone "Home" crumb would point at this page.
  if (segments.length === 0) return [];

  const home: Crumb = { label: "Home", href: "/" };
  const last = segments[segments.length - 1];

  // The agent drill-in lives at /agents/agent/<id> — "agent" is a routing
  // namespace, not a page of its own.
  if (segments[0] === "agents" && segments[1] === "agent" && segments.length > 2) {
    return [
      home,
      { label: "Agents", href: "/agents" },
      { label: humanizeAgentId(safeDecode(last)), href: pathname },
    ];
  }

  // A catalogue address ("v/ops/covia/aggregate-lattice-entries") arrives as
  // several path segments under /operation/ and /venues/<id>/operations/.
  // Its namespace segments are not pages: jump from "Operations" to the name.
  const operationsAt =
    segments[0] === "operation" ? 0 : segments[0] === "venues" && segments[2] === "operations" ? 2 : -1;
  const isOperationAddress = operationsAt >= 0 && segments.length > operationsAt + 1;
  const walked = isOperationAddress ? segments.slice(0, operationsAt + 1) : segments;

  const crumbs = [home];
  let path = "";
  walked.forEach((segment, index) => {
    path += `/${segment}`;
    const isId = ID_PARENTS.has(walked[index - 1]);
    const isVenue = walked[index - 1] === "venues";
    const suppliedName = isVenue ? names.venueName : index === walked.length - 1 ? names.assetOrJobName : undefined;
    crumbs.push({
      label: isId ? suppliedName ?? safeDecode(segment) : SEGMENTS[segment]?.label ?? titleCase(segment),
      href: SEGMENTS[segment]?.listHref ?? path,
    });
  });

  if (isOperationAddress) {
    crumbs.push({ label: names.assetOrJobName ?? titleCase(last), href: pathname });
  }
  return crumbs;
}

/** The docs page for the section a path belongs to, if there is one. */
export function docsLinkFor(pathname: string): string | undefined {
  // Matched on route segments — a substring test also hits operation
  // addresses. Most specific first: /venues/<id>/jobs is about jobs, and a
  // venue section with no page of its own falls back to the venues doc.
  const [section, , venueSection] = pathname.split("/").filter(Boolean);
  return (section === "venues" ? SEGMENTS[venueSection]?.docs : undefined) ?? SEGMENTS[section]?.docs;
}
