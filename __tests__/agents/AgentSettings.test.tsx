import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockAccess: { state: string } = { state: "connected" };
jest.mock("@/hooks/use-venue-access", () => ({
  useVenueAccess: () => mockAccess,
}));
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => true,
}));
jest.mock("@/components/admin-panel/signin-button", () => ({
  ChromeSignInButton: () => <div data-testid="chrome-sign-in-button" />,
}));

const mockVenue: any = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  secrets: { list: jest.fn().mockResolvedValue([]) },
  workspace: {
    read: jest.fn((path: string) => {
      if (path === "v/ops") {
        return Promise.resolve({
          exists: true,
          value: {
            covia: {
              read: { name: "Read", description: "Read a value", operation: { input: {}, output: {} } },
              write: { name: "Write", description: "Write a value", operation: { input: {}, output: {} } },
            },
          },
        });
      }
      return Promise.resolve({ exists: false, value: null });
    }),
  },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { AgentSettings } from "@/components/agent-config/AgentSettings";
import type { AgentDetail } from "@/config/types";

const baseAgent: AgentDetail = {
  agentId: "reader",
  status: "SLEEPING",
  config: { tools: ["v/ops/covia/read"] },
};

describe("AgentSettings — tool/skill picker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccess.state = "connected";
    mockVenue.secrets.list.mockResolvedValue([]);
  });

  async function openPickerOnCapabilitiesTab(onSave: jest.Mock, agent: AgentDetail = baseAgent) {
    const user = userEvent.setup();
    render(<AgentSettings agent={agent} onBack={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("tab", { name: "Capabilities" }));
    await user.click(screen.getByTestId("open-tool-skill-picker"));
    await user.click(screen.getByRole("button", { name: /covia/i }));
    return user;
  }

  it("reflects the agent's current tools as attached in the picker", async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    await openPickerOnCapabilitiesTab(onSave);

    expect(await screen.findByRole("checkbox", { name: "Attach Read" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Attach Write" })).not.toBeChecked();
  });

  it("toggling a tool sends a narrow agent:update patch and updates the JSON field on success", async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const user = await openPickerOnCapabilitiesTab(onSave);

    await user.click(await screen.findByRole("checkbox", { name: "Attach Write" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ tools: ["v/ops/covia/read", "v/ops/covia/write"] }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("agent-tools-json")).toHaveValue(
        JSON.stringify(["v/ops/covia/read", "v/ops/covia/write"], null, 2),
      ),
    );
  });

  it("does not update the JSON field when the save fails", async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const user = await openPickerOnCapabilitiesTab(onSave);

    await user.click(await screen.findByRole("checkbox", { name: "Attach Write" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByTestId("agent-tools-json")).toHaveValue(
      JSON.stringify(["v/ops/covia/read"], null, 2),
    );
  });
});
