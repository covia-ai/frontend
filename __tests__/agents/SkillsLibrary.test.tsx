import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/components/MarkdownMessage", () => ({
  MarkdownMessage: ({ children }: { children: string }) => (
    <div data-testid="safe-markdown">{children}</div>
  ),
}));

const mockVenue: any = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  workspace: {
    // The venue returns the whole v/skills sub-tree in one job-free read; a
    // node carrying the `skill` facet is a skill, anything else is a container
    // to descend into (frontend#351).
    read: jest.fn((path: string) => Promise.resolve(path === "v/skills"
      ? {
          exists: true,
          value: {
            agents: {
              name: "Agent skills",
              description: "Manage agents safely.",
              content: { inline: "## Agent workflow\nUse explicit tools." },
              skill: { tools: ["v/ops/agent/list"] },
            },
            // A name keyLook maps to its own concept (building → create).
            building: {
              name: "Building agents",
              description: "Assemble agents from operations.",
              content: { inline: "## Build\nCompose operations." },
              skill: {},
            },
            // An unmapped name → the skill-glyph fallback tile (never blank).
            "zzz-unmapped": {
              name: "Zulu miscellany",
              description: "An unmapped skill name.",
              content: { inline: "## Misc" },
              skill: {},
            },
            // A container, not a skill: no facet of its own, children one
            // level down. The old direct-children listing showed this as a
            // description-less skill and hid what was inside it.
            connections: {
              sentry: {
                name: "Sentry",
                description: "Read Sentry issues.",
                content: { inline: "## Sentry" },
                skill: { tools: ["v/ops/http/get"] },
              },
            },
          },
        }
      : { exists: false, value: null })),
  },
  assets: {
    get: jest.fn(),
    getContent: jest.fn(),
  },
  agents: {
    list: jest.fn().mockResolvedValue({ agents: [{ agentId: "manager" }] }),
    info: jest.fn().mockResolvedValue({
      agentId: "manager",
      status: "SLEEPING",
      config: { skills: ["v/skills/agents"] },
    }),
  },
  operations: { run: jest.fn(), invoke: jest.fn() },
};

jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => mockVenue,
}));

import { SkillsLibrary } from "@/components/SkillsLibrary";

describe("SkillsLibrary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists and reads skills without creating jobs, then derives agent links on demand", async () => {
    render(<SkillsLibrary />);

    expect(await screen.findByRole("heading", { name: "Agent skills" })).toBeInTheDocument();
    expect(screen.getByTestId("safe-markdown")).toHaveTextContent("Agent workflow");
    expect(screen.getByText("No user skills yet", { exact: false })).toBeInTheDocument();
    expect(mockVenue.workspace.read).toHaveBeenCalledWith("v/skills");
    expect(mockVenue.workspace.read).toHaveBeenCalledWith("w/skills");
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
    expect(mockVenue.operations.invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Find agents" }));
    expect(await screen.findByRole("link", { name: /manager/i })).toHaveAttribute(
      "href",
      "/agents/agent/manager",
    );
    await waitFor(() => expect(mockVenue.agents.info).toHaveBeenCalledWith("manager"));
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });

  it("renders an icon tile on every skill row, including unmapped names", async () => {
    render(<SkillsLibrary />);

    // Wait for the list to populate.
    await screen.findByText("Agent skills");

    // Each skill row is a button carrying the skill name; assert each one
    // renders an icon (an <svg> inside its tile) so no row is text-only/blank.
    for (const name of ["Agent skills", "Building agents", "Zulu miscellany"]) {
      const row = screen.getByText(name).closest("button");
      expect(row).not.toBeNull();
      expect(row!.querySelector("svg")).toBeInTheDocument();
    }

    // Distinct concepts → distinct glyphs (agents vs building are not the same
    // icon), proving the lookup discriminates rather than stamping one glyph.
    const agentsIcon = screen.getByText("Agent skills").closest("button")!.querySelector("svg")?.innerHTML;
    const buildingIcon = screen.getByText("Building agents").closest("button")!.querySelector("svg")?.innerHTML;
    expect(agentsIcon).toBeTruthy();
    expect(agentsIcon).not.toBe(buildingIcon);
  });
});
