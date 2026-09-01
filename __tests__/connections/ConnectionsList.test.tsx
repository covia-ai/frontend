import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ConnectionsList } from "@/components/ConnectionsList";

let mockAuthenticated = true;
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => mockAuthenticated,
}));

const mockRevalidate = jest.fn();
let mockVenue: any;
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
  revalidateVenueOnFailure: (...args: unknown[]) => mockRevalidate(...args),
}));

const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();
jest.mock("@/lib/notify", () => ({
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
  notifySuccess: (...args: unknown[]) => mockNotifySuccess(...args),
}));

function makeVenue(secretNames: string[]) {
  return {
    baseUrl: "https://venue.example",
    secrets: {
      list: jest.fn().mockResolvedValue(secretNames),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    operations: {
      run: jest.fn(),
    },
  };
}

// jsdom lays out nothing (every element reports a 0,0,0,0 rect), so
// userEvent's coordinate-based hit-testing is unreliable across the 15
// near-identical, stacked "Connect" buttons the unfiltered catalogue
// renders. Searching down to the one target service first — same as a real
// user would to find it — sidesteps the ambiguity entirely.
async function openConnectDialog(user: ReturnType<typeof userEvent.setup>, serviceName: string) {
  await user.type(
    screen.getByPlaceholderText(/Search services, or paste a token/),
    serviceName,
  );
  await user.click(await screen.findByText("Connect"));
}

describe("ConnectionsList", () => {
  beforeEach(() => {
    mockAuthenticated = true;
    mockRevalidate.mockClear();
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();
    mockVenue = makeVenue([]);
  });

  it("shows a sign-in gate instead of the catalogue when signed out", () => {
    mockAuthenticated = false;
    render(<ConnectionsList />);
    expect(screen.getByText(/Sign in to connect services/)).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("surfaces an already-connected service in its own section, ahead of the catalogue", async () => {
    mockVenue = makeVenue(["GITHUB_TOKEN"]);
    render(<ConnectionsList />);

    expect(await screen.findByText("Connected · 1")).toBeInTheDocument();
    // GitHub's card shows the Connected badge; Notion (uncatalogued here) does not.
    const githubHeading = screen.getByText("GitHub");
    const githubCard = githubHeading.closest("div.rounded-xl") as HTMLElement;
    expect(githubCard).not.toBeNull();
    expect(within(githubCard).getByText("Connected")).toBeInTheDocument();
  });

  it("filters the catalogue by search text", async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);
    await waitFor(() => expect(mockVenue.secrets.list).toHaveBeenCalled());

    await user.type(
      screen.getByPlaceholderText(/Search services, or paste a token/),
      "notion",
    );

    expect(await screen.findByText("1 result")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("auto-detects a service from a pasted token prefix and opens the add dialog on Enter", async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);
    await waitFor(() => expect(mockVenue.secrets.list).toHaveBeenCalled());

    const search = screen.getByPlaceholderText(/Search services, or paste a token/);
    await user.type(search, "ghp_abcdef123456");

    expect(await screen.findByText(/Looks like/)).toBeInTheDocument();

    await user.type(search, "{Enter}");

    expect(await screen.findByText("Connect GitHub")).toBeInTheDocument();
    // The detected token rides straight into the dialog's input.
    expect(screen.getByPlaceholderText(/github_pat_/)).toHaveValue("ghp_abcdef123456");
  });

  it("verifies the token before saving, then reports success and marks the service connected", async () => {
    const user = userEvent.setup();
    // The http op returns body as a JSON *string* — mirror that so this guards
    // the parse in runVerify (an object here would hide a real 200 regression).
    mockVenue.operations.run.mockResolvedValue({
      status: 200,
      body: '{"login":"octocat"}',
    });
    render(<ConnectionsList />);
    await waitFor(() => expect(mockVenue.secrets.list).toHaveBeenCalled());

    await openConnectDialog(user, "github");
    expect(await screen.findByText("Connect GitHub")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/github_pat_/), "github_pat_abc");
    await user.click(screen.getByRole("button", { name: /Test & connect/ }));

    expect(await screen.findByText("Connected as @octocat")).toBeInTheDocument();
    expect(mockVenue.secrets.set).toHaveBeenCalledWith("GITHUB_TOKEN", "github_pat_abc");
    expect(mockVenue.secrets.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(mockNotifySuccess).toHaveBeenCalledWith(
      "GitHub connected",
      expect.objectContaining({ description: expect.stringContaining("github") }),
    );
    await waitFor(() =>
      expect(screen.getAllByText("Connected").length).toBeGreaterThan(0),
    );
  });

  it("deletes the unverifiable token and reports the failure, without marking the service connected", async () => {
    const user = userEvent.setup();
    mockVenue.operations.run.mockResolvedValue({
      status: 401,
      body: '{"message":"Bad credentials"}',
    });
    render(<ConnectionsList />);
    await waitFor(() => expect(mockVenue.secrets.list).toHaveBeenCalled());

    await openConnectDialog(user, "github");
    await screen.findByText("Connect GitHub");
    await user.type(screen.getByPlaceholderText(/github_pat_/), "bad-token");
    await user.click(screen.getByRole("button", { name: /Test & connect/ }));

    expect(
      await screen.findByText(/GitHub rejected the token \(401\): Bad credentials/),
    ).toBeInTheDocument();
    expect(mockVenue.secrets.set).toHaveBeenCalledWith("GITHUB_TOKEN", "bad-token");
    expect(mockVenue.secrets.delete).toHaveBeenCalledWith("GITHUB_TOKEN");
    expect(screen.queryByText("Connected · 1")).not.toBeInTheDocument();
  });

  it("stores the token directly for a service with no live verify, and confirms without testing", async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);
    await waitFor(() => expect(mockVenue.secrets.list).toHaveBeenCalled());

    // Jira has no `verify` in the manifest.
    await openConnectDialog(user, "jira");
    await screen.findByText("Connect Jira");

    await user.type(screen.getByPlaceholderText(/Basic/), "Basic dGVzdA==");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(await screen.findByText("Saved. Validates on first use.")).toBeInTheDocument();
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });

  it("disconnects a connected service after confirming, and clears its Connected state", async () => {
    const user = userEvent.setup();
    mockVenue = makeVenue(["GITHUB_TOKEN"]);
    render(<ConnectionsList />);
    await screen.findByText("Connected · 1");

    // The disconnect trigger is the icon-only trash button on the connected card.
    const githubCard = screen.getByText("GitHub").closest("div.rounded-xl") as HTMLElement;
    await user.click(within(githubCard).getByRole("button"));

    await user.click(await screen.findByRole("button", { name: "Disconnect" }));

    expect(mockVenue.secrets.delete).toHaveBeenCalledWith("GITHUB_TOKEN");
    expect(mockNotifySuccess).toHaveBeenCalledWith("GitHub disconnected");
    await waitFor(() => expect(screen.queryByText("Connected · 1")).not.toBeInTheDocument());
  });
});
