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
      "/agents/view?agentId=manager",
    );
    await waitFor(() => expect(mockVenue.agents.info).toHaveBeenCalledWith("manager"));
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });
});
