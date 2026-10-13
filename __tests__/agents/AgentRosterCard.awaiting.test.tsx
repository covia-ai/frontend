import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/components/agent-roster/AgentLiveActivity", () => ({ AgentLiveActivity: () => null }));
jest.mock("@/components/agent-explorer/DeleteAgentDialog", () => ({ DeleteAgentDialog: () => null }));

import { AgentRosterCard } from "@/components/agent-roster/AgentRosterCard";
import { TooltipProvider } from "@/components/ui/tooltip";

const venue: any = { baseUrl: "https://v.example", agent: () => ({}) };

const renderCard = (agent: Record<string, unknown>) =>
  render(
    <TooltipProvider>
      <AgentRosterCard agent={{ agentId: "refund-bot", status: "SLEEPING", ...agent }} venue={venue} onChanged={jest.fn()} />
    </TooltipProvider>,
  );

beforeEach(() => mockPush.mockClear());

describe("AgentRosterCard waiting on a person (#364)", () => {
  it("shows the waiting strip with a link to answer, alongside the lifecycle status", () => {
    renderCard({ awaiting: { input: 2, auth: 1 } });

    const strip = screen.getByTestId("roster-awaiting");
    expect(strip).toHaveTextContent("Waiting on you · 2 requests need input · 1 request needs sign-in");
    expect(strip).toHaveAttribute("href", "/inbox?agent=refund-bot");
    expect(screen.getByText(/sleeping/i)).toBeInTheDocument();
  });

  it("does not also open the agent when the strip is clicked", () => {
    renderCard({ awaiting: { input: 0, auth: 1 } });

    const strip = screen.getByTestId("roster-awaiting");
    expect(strip).toHaveAttribute("href", "/jobs?status=AUTH_REQUIRED");
    strip.click();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("has no strip when nothing is waiting", () => {
    renderCard({ awaiting: { input: 0, auth: 0 } });
    expect(screen.queryByTestId("roster-awaiting")).not.toBeInTheDocument();
  });
});
