jest.mock("@/lib/operations-catalog", () => ({
  listCatalogOperations: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/job-history", () => ({
  sliceJobWindow: jest.fn().mockResolvedValue({ count: 0, values: [] }),
  jobRecordsFromSlice: jest.fn(() => []),
}));
jest.mock("@/lib/skills", () => ({
  skillsFromAssets: jest.fn(() => []),
}));
jest.mock("@/lib/hitl", () => ({
  listHitlRequests: jest.fn().mockResolvedValue([]),
}));

import { fetchVenueItems } from "@/lib/command-palette";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { sliceJobWindow, jobRecordsFromSlice } from "@/lib/job-history";
import { skillsFromAssets } from "@/lib/skills";
import { listHitlRequests } from "@/lib/hitl";
import type { VenueDescriptor } from "@/hooks/use-venues";

const mockListCatalogOperations = listCatalogOperations as jest.MockedFunction<
  typeof listCatalogOperations
>;
const mockSliceJobWindow = sliceJobWindow as jest.MockedFunction<typeof sliceJobWindow>;
const mockJobRecordsFromSlice = jobRecordsFromSlice as jest.MockedFunction<
  typeof jobRecordsFromSlice
>;
const mockSkillsFromAssets = skillsFromAssets as jest.MockedFunction<typeof skillsFromAssets>;
const mockListHitlRequests = listHitlRequests as jest.MockedFunction<typeof listHitlRequests>;

const descriptor: VenueDescriptor = {
  venueId: "did:key:zVENUE",
  baseUrl: "http://venue.test",
  metadata: { name: "Test Venue" },
};

function mockVenue(overrides: Record<string, unknown> = {}) {
  return {
    listAssets: jest.fn().mockResolvedValue({ items: [] }),
    skills: { list: jest.fn().mockResolvedValue([]) },
    workspace: { list: jest.fn().mockResolvedValue({ count: 0 }) },
    agents: { list: jest.fn().mockResolvedValue({ agents: [] }) },
    ...overrides,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListCatalogOperations.mockResolvedValue([]);
  mockSliceJobWindow.mockResolvedValue({ count: 0, values: [] });
  mockJobRecordsFromSlice.mockReturnValue([]);
  mockSkillsFromAssets.mockReturnValue([]);
  mockListHitlRequests.mockResolvedValue([]);
});

describe("fetchVenueItems", () => {
  it("normalizes one hit per domain, each tagged with the venue", async () => {
    const venue = mockVenue({
      listAssets: jest.fn().mockResolvedValue({
        items: [{ id: "a/hash1", metadata: { name: "My Asset", description: "an artifact" } }],
      }),
      agents: { list: jest.fn().mockResolvedValue({ agents: [{ agentId: "agent-1", status: "active" }] }) },
    });
    mockListCatalogOperations.mockResolvedValue([
      { path: "v/ops/foo/bar", metadata: { name: "Foo Bar", description: "does a thing" } },
    ]);
    mockJobRecordsFromSlice.mockReturnValue([
      { id: "job-1", name: "My Job", status: "COMPLETE" } as any,
    ]);
    mockSkillsFromAssets.mockImplementation((_assets, source) =>
      source === "venue"
        ? [{ key: "s1", name: "My Skill", description: "a skill", path: "v/skills/s1", source: "venue", body: null, tools: [], reference: null, hasContent: false }]
        : [],
    );
    mockListHitlRequests.mockResolvedValue([
      { id: "r1", title: "Approve deploy", status: "open", asks: [] } as any,
    ]);

    const { items, failed } = await fetchVenueItems(venue, descriptor, { authenticated: true });

    expect(failed).toBe(false);
    expect(items).toHaveLength(6);

    const asset = items.find((i) => i.kind === "asset")!;
    expect(asset).toMatchObject({
      id: "a/hash1",
      title: "My Asset",
      venueId: descriptor.venueId,
      venueName: "Test Venue",
      href: `/venues/${encodeURIComponent(descriptor.venueId)}/assets/${encodeURIComponent("a/hash1")}`,
      requiresVenueSwitch: false,
    });

    const operation = items.find((i) => i.kind === "operation")!;
    expect(operation).toMatchObject({
      id: "v/ops/foo/bar",
      title: "Foo Bar",
      href: `/venues/${encodeURIComponent(descriptor.venueId)}/operations/v/ops/foo/bar`,
      requiresVenueSwitch: false,
    });

    const job = items.find((i) => i.kind === "job")!;
    expect(job).toMatchObject({
      id: "job-1",
      title: "My Job",
      href: `/venues/${encodeURIComponent(descriptor.venueId)}/jobs/job-1`,
      requiresVenueSwitch: false,
    });

    const skill = items.find((i) => i.kind === "skill")!;
    expect(skill).toMatchObject({ id: "s1", title: "My Skill", href: "/agents/skills" });

    const hitl = items.find((i) => i.kind === "hitl")!;
    expect(hitl).toMatchObject({
      id: "r1",
      title: "Approve deploy",
      href: "/inbox?requestId=r1",
      requiresVenueSwitch: true,
    });

    const agent = items.find((i) => i.kind === "agent")!;
    expect(agent).toMatchObject({
      id: "agent-1",
      title: "agent-1",
      href: "/agents/agent/agent-1",
      requiresVenueSwitch: true,
    });
    expect(agent.quickActions).toEqual([
      expect.objectContaining({
        href: "/agents/chat?agentId=agent-1",
        requiresVenueSwitch: true,
        // Always true regardless of the fetching user's own auth — gating
        // happens at render time against the *target* venue's live auth
        // state, not baked in at fetch time (see CommandPalette.tsx).
        requiresAuth: true,
      }),
    ]);
  });

  it("keeps every other domain's results when one domain rejects", async () => {
    const venue = mockVenue({
      listAssets: jest.fn().mockResolvedValue({
        items: [{ id: "a/hash1", metadata: { name: "Still Here" } }],
      }),
    });
    mockListCatalogOperations.mockRejectedValue(new Error("venue unreachable"));

    const { items, failed } = await fetchVenueItems(venue, descriptor, { authenticated: false });

    expect(failed).toBe(true);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "asset", title: "Still Here" });
  });

  it("excludes assets that are actually operations, agent templates, or skills", async () => {
    const venue = mockVenue({
      listAssets: jest.fn().mockResolvedValue({
        items: [
          { id: "a/op", metadata: { name: "An Operation", operation: { adapter: "http:get" } } },
          { id: "a/plain", metadata: { name: "A Plain Asset" } },
        ],
      }),
    });

    const { items } = await fetchVenueItems(venue, descriptor, { authenticated: false });

    const assetTitles = items.filter((i) => i.kind === "asset").map((i) => i.title);
    expect(assetTitles).toEqual(["A Plain Asset"]);
  });

  it("only surfaces open HITL requests", async () => {
    const venue = mockVenue();
    mockListHitlRequests.mockResolvedValue([
      { id: "open-1", title: "Needs a decision", status: "open", asks: [] } as any,
      { id: "closed-1", title: "Already handled", status: "resolved", asks: [] } as any,
    ]);

    const { items } = await fetchVenueItems(venue, descriptor, { authenticated: true });

    expect(items.map((i) => i.id)).toEqual(["open-1"]);
  });
});
