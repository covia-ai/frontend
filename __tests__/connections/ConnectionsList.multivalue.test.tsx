import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// A synthetic multi-value connector (site subdomain + token, like Zendesk) so
// the multi-field setup flow can be tested before the real Phase 3 connectors
// land. The rest of the catalogue module is the real one.
jest.mock("@/config/connections", () => {
  const actual = jest.requireActual("@/config/connections");
  const zendesk = {
    id: "zendesk-x", name: "Zendesk", method: "key", secretName: "ZENDESK_TOKEN",
    skillId: "connections/zendesk-x", blurb: "Support tickets and users.",
    category: "CRM & Support", initials: "ZD", color: "#03363D",
    tokenUrl: "https://zendesk.com", createSteps: ["Create an API token in the admin centre."],
    placeholder: "", baseUrl: "https://{s/ZENDESK_SITE}.zendesk.com/api/v2", auth: "bearer",
    secrets: [
      { name: "ZENDESK_SITE", label: "Site", placeholder: "acme" },
      { name: "ZENDESK_TOKEN", label: "API token", placeholder: "the token" },
    ],
    verify: { path: "/users/me.json", label: (b: any) => (b?.user?.name ? `Connected as ${b.user.name}` : null) },
  };
  return { ...actual, CONNECTIONS: [zendesk] };
});

let mockAuthenticated = true;
jest.mock("@/hooks/use-auth", () => ({ useIsAuthenticated: () => mockAuthenticated }));

let mockVenue: any;
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
  revalidateVenueOnFailure: jest.fn(),
}));
jest.mock("@/lib/notify", () => ({ notifyError: jest.fn(), notifySuccess: jest.fn() }));

import { ConnectionsList } from "@/components/ConnectionsList";

function makeVenue(secretNames: string[] = []) {
  return {
    baseUrl: "https://venue.example",
    secrets: {
      list: jest.fn().mockResolvedValue(secretNames),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    operations: { run: jest.fn().mockResolvedValue({ status: 200, body: '{"user":{"name":"Ada"}}' }) },
  };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/Search services, or paste a token/), "Zendesk");
  await user.click(await screen.findByText("Connect"));
}

describe("ConnectionsList — multi-value connector", () => {
  beforeEach(() => { mockAuthenticated = true; mockVenue = makeVenue(); });

  it("renders one labelled field per secret and both storage names", async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);
    await openDialog(user);

    expect(await screen.findByPlaceholderText("acme")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("the token")).toBeInTheDocument();
    expect(screen.getByText("Site")).toBeInTheDocument();
    expect(screen.getByText("API token")).toBeInTheDocument();
    // Both stored names are named to the user.
    expect(screen.getByText("ZENDESK_SITE")).toBeInTheDocument();
    expect(screen.getByText("ZENDESK_TOKEN")).toBeInTheDocument();
  });

  it("keeps connect disabled until every field is filled", async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);
    await openDialog(user);

    const connect = screen.getByRole("button", { name: /Test & connect/ });
    expect(connect).toBeDisabled();
    await user.type(await screen.findByPlaceholderText("acme"), "acme");
    expect(connect).toBeDisabled(); // token still empty
    await user.type(screen.getByPlaceholderText("the token"), "tok_123");
    expect(connect).toBeEnabled();
  });

  it("stores each value under its own secret and verifies", async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);
    await openDialog(user);

    await user.type(await screen.findByPlaceholderText("acme"), "acme");
    await user.type(screen.getByPlaceholderText("the token"), "tok_123");
    await user.click(screen.getByRole("button", { name: /Test & connect/ }));

    await waitFor(() => expect(screen.getByText("Connected as Ada")).toBeInTheDocument());
    expect(mockVenue.secrets.set).toHaveBeenCalledWith("ZENDESK_SITE", "acme");
    expect(mockVenue.secrets.set).toHaveBeenCalledWith("ZENDESK_TOKEN", "tok_123");
    // Verify ran, and the site placeholder is left for the venue to resolve.
    const call = mockVenue.operations.run.mock.calls[0];
    expect(call[0]).toBe("v/ops/http/get");
    expect(call[1].url).toContain("{s/ZENDESK_SITE}");
    expect(call[1].bearerSecret).toBe("s/ZENDESK_TOKEN");
  });

  it("removes every stored value on disconnect", async () => {
    const user = userEvent.setup();
    mockVenue = makeVenue(["ZENDESK_TOKEN"]); // primary present ⇒ shows as connected
    render(<ConnectionsList />);
    await screen.findByText("Connected · 1");

    // Trash icon on the connected card, then confirm in the alert dialog.
    const card = screen.getByText("Zendesk").closest("div.rounded-xl") as HTMLElement;
    await user.click(within(card).getByRole("button"));
    await user.click(await screen.findByRole("button", { name: "Disconnect" }));

    await waitFor(() => {
      expect(mockVenue.secrets.delete).toHaveBeenCalledWith("ZENDESK_SITE");
      expect(mockVenue.secrets.delete).toHaveBeenCalledWith("ZENDESK_TOKEN");
    });
  });
});
