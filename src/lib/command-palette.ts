import type { Venue } from "@covia/covia-sdk";
import { getAssetKind } from "@/lib/asset-kind";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { sliceJobWindow, jobRecordsFromSlice } from "@/lib/job-history";
import { skillsFromAssets } from "@/lib/skills";
import { listHitlRequests } from "@/lib/hitl";
import type { VenueDescriptor } from "@/hooks/use-venues";

export type PaletteItemKind =
  | "asset"
  | "operation"
  | "skill"
  | "job"
  | "hitl"
  | "agent";

export type PaletteQuickAction = {
  id: string;
  label: string;
  href: string;
  requiresVenueSwitch: boolean;
  requiresAuth: boolean;
};

export type PaletteItem = {
  kind: PaletteItemKind;
  id: string;
  title: string;
  subtitle?: string;
  venueId: string;
  venueName: string;
  href: string;
  requiresVenueSwitch: boolean;
  quickActions?: PaletteQuickAction[];
};

// A page load's worth of the most recent jobs — deep job history search stays
// on the dedicated /jobs page; the palette only needs "jump to a recent one".
const RECENT_JOBS_WINDOW = 30;

function venueHref(venueId: string, rest: string): string {
  return `/venues/${encodeURIComponent(venueId)}/${rest}`;
}

async function fetchAssetItems(
  venue: Venue,
  descriptor: VenueDescriptor,
): Promise<PaletteItem[]> {
  const assetList = await venue.listAssets({ expand: "metadata" });
  const venueName = descriptor.metadata.name ?? descriptor.venueId;
  return assetList.items
    .filter((entry) => {
      if (entry.metadata?.name == undefined) return false;
      const kind = getAssetKind(entry.metadata);
      return kind !== "operation" && kind !== "agent-template" && kind !== "skill";
    })
    .map((entry) => ({
      kind: "asset" as const,
      id: entry.id,
      title: entry.metadata.name as string,
      subtitle: entry.metadata.description as string | undefined,
      venueId: descriptor.venueId,
      venueName,
      href: venueHref(descriptor.venueId, `assets/${encodeURIComponent(entry.id)}`),
      requiresVenueSwitch: false,
    }));
}

async function fetchOperationItems(
  venue: Venue,
  descriptor: VenueDescriptor,
  authenticated: boolean,
): Promise<PaletteItem[]> {
  const ops = await listCatalogOperations(venue, { includeUserOps: authenticated });
  const venueName = descriptor.metadata.name ?? descriptor.venueId;
  return ops.map((op) => ({
    kind: "operation" as const,
    id: op.path,
    title: (op.metadata?.name as string | undefined) ?? op.path,
    subtitle: op.metadata?.description as string | undefined,
    venueId: descriptor.venueId,
    venueName,
    href: venueHref(descriptor.venueId, `operations/${op.path}`),
    requiresVenueSwitch: false,
  }));
}

async function fetchSkillItems(
  venue: Venue,
  descriptor: VenueDescriptor,
): Promise<PaletteItem[]> {
  const [venueSkills, userSkills] = await Promise.all([
    venue.skills.list("v/skills"),
    venue.skills.list("w/skills").catch(() => []),
  ]);
  const venueName = descriptor.metadata.name ?? descriptor.venueId;
  const skills = [
    ...skillsFromAssets(venueSkills, "venue"),
    ...skillsFromAssets(userSkills, "user"),
  ];
  // Skill selection isn't URL-addressable (SkillsLibrary picks the first
  // skill and tracks selection in local state only) — every hit opens the
  // library itself rather than a fabricated deep link.
  return skills.map((skill) => ({
    kind: "skill" as const,
    id: skill.key,
    title: skill.name,
    subtitle: skill.description,
    venueId: descriptor.venueId,
    venueName,
    href: "/agents/skills",
    requiresVenueSwitch: false,
  }));
}

async function fetchJobItems(
  venue: Venue,
  descriptor: VenueDescriptor,
): Promise<PaletteItem[]> {
  const guessCount = (await venue.workspace.list("j", 1)).count ?? 0;
  const windowFor = (count: number) => ({
    start: Math.max(0, count - RECENT_JOBS_WINDOW),
    end: count,
  });
  const { values } = await sliceJobWindow(venue, windowFor, guessCount);
  const venueName = descriptor.metadata.name ?? descriptor.venueId;
  return jobRecordsFromSlice(values).map((job) => ({
    kind: "job" as const,
    id: job.id as string,
    title: (job.name as string | undefined) ?? (job.operation as string | undefined) ?? (job.id as string),
    subtitle: job.status as string | undefined,
    venueId: descriptor.venueId,
    venueName,
    href: venueHref(descriptor.venueId, `jobs/${job.id}`),
    requiresVenueSwitch: false,
  }));
}

async function fetchHitlItems(
  venue: Venue,
  descriptor: VenueDescriptor,
): Promise<PaletteItem[]> {
  const requests = await listHitlRequests(venue);
  const venueName = descriptor.metadata.name ?? descriptor.venueId;
  return requests
    .filter((request) => request.status === "open")
    .map((request) => ({
      kind: "hitl" as const,
      id: request.id,
      title: request.title,
      subtitle: request.description,
      venueId: descriptor.venueId,
      venueName,
      href: `/inbox?requestId=${encodeURIComponent(request.id)}`,
      requiresVenueSwitch: true,
    }));
}

async function fetchAgentItems(
  venue: Venue,
  descriptor: VenueDescriptor,
): Promise<PaletteItem[]> {
  const { agents } = await venue.agents.list();
  const venueName = descriptor.metadata.name ?? descriptor.venueId;
  return agents.map((agent) => {
    const chatHref = `/agents/chat?agentId=${encodeURIComponent(agent.agentId)}`;
    const viewHref = `/agents/agent/${encodeURIComponent(agent.agentId)}`;
    return {
      kind: "agent" as const,
      id: agent.agentId,
      title: agent.agentId,
      subtitle: agent.status as string | undefined,
      venueId: descriptor.venueId,
      venueName,
      href: viewHref,
      requiresVenueSwitch: true,
      quickActions: [
        {
          id: "new-chat",
          label: `New chat with ${agent.agentId}`,
          href: chatHref,
          requiresVenueSwitch: true,
          // Whether this is actually usable depends on auth for *this*
          // agent's venue, checked at render time (per-venue authMap) — not
          // baked in here, since that would reflect the venue's auth at
          // fetch time rather than whatever it is when the user acts.
          requiresAuth: true,
        },
      ],
    };
  });
}

// Fans out every job-free domain read for one venue. Each domain is isolated
// with Promise.allSettled — one unreachable venue, or one domain a venue
// doesn't support, must never blank out the rest of the palette's results.
export async function fetchVenueItems(
  venue: Venue,
  descriptor: VenueDescriptor,
  opts: { authenticated: boolean },
): Promise<{ items: PaletteItem[]; failed: boolean }> {
  const results = await Promise.allSettled([
    fetchAssetItems(venue, descriptor),
    fetchOperationItems(venue, descriptor, opts.authenticated),
    fetchSkillItems(venue, descriptor),
    fetchJobItems(venue, descriptor),
    fetchHitlItems(venue, descriptor),
    fetchAgentItems(venue, descriptor),
  ]);

  const items: PaletteItem[] = [];
  let failed = false;
  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value);
    else failed = true;
  }
  return { items, failed };
}
