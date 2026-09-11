import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// On /agents/agent/<id> the URL names the agent and the breadcrumb reads it
// from there, so picking a different agent in the left panel has to move the
// URL too. Elsewhere the component just changes its own selection.
const mockReplace = jest.fn();
let mockPathname = "/agents/agent/alpha";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => ({ get: jest.fn() }),
}));

jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div /> }));
jest.mock("@/components/agent-explorer/AgentChatPanel", () => ({
  AgentChatPanel: () => <div />,
}));
jest.mock("@/components/agent-explorer/AgentListPanel", () => ({
  AgentListPanel: ({ onSelect }: any) => (
    <button type="button" onClick={() => onSelect("beta agent")}>
      pick beta
    </button>
  ),
}));

const mockSetSelectedAgentId = jest.fn();
jest.mock("@/hooks/use-agent-explorer", () => ({
  useAgentExplorer: () => ({
    agentList: [],
    loading: false,
    selectedAgentId: "alpha",
    setSelectedAgentId: mockSetSelectedAgentId,
  }),
}));

import AgentExplorer from "@/components/AgentExplorer";

describe("AgentExplorer selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/agents/agent/alpha";
  });

  it("moves the URL to the picked agent on the drill-in route", async () => {
    render(<AgentExplorer agentId="alpha" />);

    await userEvent.click(screen.getByText("pick beta"));

    expect(mockSetSelectedAgentId).toHaveBeenCalledWith("beta agent");
    expect(mockReplace).toHaveBeenCalledWith("/agents/agent/beta%20agent");
  });

  it("leaves the URL alone when mounted outside the drill-in route", async () => {
    mockPathname = "/agents/chat";
    render(<AgentExplorer />);

    await userEvent.click(screen.getByText("pick beta"));

    expect(mockSetSelectedAgentId).toHaveBeenCalledWith("beta agent");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
