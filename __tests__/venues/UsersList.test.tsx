import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();
jest.mock("@/lib/notify", () => ({
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
  notifySuccess: (...args: unknown[]) => mockNotifySuccess(...args),
  jobFailure: (err: unknown) => ({ reason: err, jobHref: undefined }),
}));

const mockRevalidate = jest.fn();
jest.mock("@/hooks/use-authenticated-venue", () => ({
  revalidateVenueOnFailure: (...args: unknown[]) => mockRevalidate(...args),
}));

let mockStatus: any = { access: { public: true, userAutoCreate: true } };
jest.mock("@/lib/venue-registry", () => ({
  getVenueStatus: () => Promise.resolve(mockStatus),
}));

const mockVenue: any = {
  baseUrl: "https://venue.example",
  venueId: "did:key:zVenue",
  metadata: { name: "Test Venue" },
  users: {
    list: jest.fn(),
    listAuthenticators: jest.fn(),
    revokeAuthenticator: jest.fn(),
  },
};

let mockContext: any;
jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => mockContext,
}));

import { UsersList } from "@/components/UsersList";

describe("UsersList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = { access: { public: true, userAutoCreate: true } };
    mockContext = { venue: mockVenue, isAuthenticated: true, auth: { type: "keypair" }, status: "ready" };
  });

  it("shows a sign-in prompt and never calls users.list when signed out", async () => {
    mockContext = { venue: mockVenue, isAuthenticated: false, auth: null, status: "ready" };
    render(<UsersList venueId="venue-1" />);

    expect(await screen.findByText("Authentication required")).toBeInTheDocument();
    expect(mockVenue.users.list).not.toHaveBeenCalled();
  });

  it("states the admission policy truthfully from venue status", async () => {
    mockVenue.users.list.mockResolvedValue({ users: [], total: 0 });
    render(<UsersList venueId="venue-1" />);

    expect(await screen.findByText(/admitted automatically/i)).toBeInTheDocument();
  });

  it("omits the admission-policy claim when the venue predates it", async () => {
    mockStatus = {};
    mockVenue.users.list.mockResolvedValue({ users: [], total: 0 });
    render(<UsersList venueId="venue-1" />);

    expect(await screen.findByText(/unavailable for this venue/i)).toBeInTheDocument();
  });

  it("shows a gated notice — not an error toast — on a 403 (signed in, not an operator)", async () => {
    mockVenue.users.list.mockRejectedValue({ statusCode: 403, message: "denied" });
    render(<UsersList venueId="venue-1" />);

    expect(await screen.findByText("Operator access required")).toBeInTheDocument();
    expect(mockNotifyError).not.toHaveBeenCalled();
    expect(mockRevalidate).not.toHaveBeenCalled();
  });

  it("toasts and revalidates the venue on a non-403 failure", async () => {
    mockVenue.users.list.mockRejectedValue({ statusCode: 500, message: "boom" });
    render(<UsersList venueId="venue-1" />);

    await screen.findByText("Unable to load users");
    expect(mockNotifyError).toHaveBeenCalledWith(
      "Unable to load users",
      expect.objectContaining({ statusCode: 500 }),
      mockVenue.baseUrl,
    );
    expect(mockRevalidate).toHaveBeenCalled();
  });

  it("renders the operator table with DIDs and account type", async () => {
    mockVenue.users.list.mockResolvedValue({
      users: [
        { did: "did:key:zAlice", registered: true, managed: true },
        { did: "did:key:zBob", registered: true, managed: false },
      ],
      total: 2,
    });
    render(<UsersList venueId="venue-1" />);

    expect(await screen.findByText("2 users")).toBeInTheDocument();
    expect(screen.getByText("Managed")).toBeInTheDocument();
    expect(screen.getByText("External")).toBeInTheDocument();
  });

  it("lazy-loads authenticators on expand and keeps a revoked entry visible as a tombstone", async () => {
    const user = userEvent.setup();
    mockVenue.users.list.mockResolvedValue({
      users: [{ did: "did:key:zAlice", registered: true, managed: true }],
      total: 1,
    });
    mockVenue.users.listAuthenticators.mockResolvedValue({
      did: "did:key:zAlice",
      authenticationKeys: {
        "did:key:zAuth1": { status: "active", addedAt: 1000, addedBy: "did:key:zVenue" },
        "did:key:zAuth2": {
          status: "revoked", addedAt: 900, addedBy: "did:key:zVenue",
          revokedAt: 2000, revokedBy: "did:key:zVenue",
        },
      },
    });
    render(<UsersList venueId="venue-1" />);

    // Click a neutral part of the row (not the DID itself, which is its own
    // dropdown trigger for Copy — see the stopPropagation comment in
    // UsersList.tsx) to toggle expand.
    await screen.findByText("did:key:zAlice");
    const row = screen.getByText("Managed");
    expect(mockVenue.users.listAuthenticators).not.toHaveBeenCalled();

    await user.click(row);

    await waitFor(() => expect(mockVenue.users.listAuthenticators).toHaveBeenCalledWith("did:key:zAlice"));
    expect(await screen.findByText("active")).toBeInTheDocument();
    expect(await screen.findByText("revoked")).toBeInTheDocument();
  });

  it("confirms before revoking, then refetches that user's authenticators", async () => {
    const user = userEvent.setup();
    mockVenue.users.list.mockResolvedValue({
      users: [{ did: "did:key:zAlice", registered: true, managed: true }],
      total: 1,
    });
    mockVenue.users.listAuthenticators.mockResolvedValue({
      did: "did:key:zAlice",
      authenticationKeys: {
        "did:key:zAuth1": { status: "active", addedAt: 1000, addedBy: "did:key:zVenue" },
      },
    });
    mockVenue.users.revokeAuthenticator.mockResolvedValue({ did: "did:key:zAlice", key: "did:key:zAuth1", revoked: true });

    render(<UsersList venueId="venue-1" />);
    await screen.findByText("did:key:zAlice");
    await user.click(screen.getByText("Managed"));
    await screen.findByText("active");

    await user.click(await screen.findByRole("button", { name: "Revoke" }));
    expect(mockVenue.users.revokeAuthenticator).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Revoke" }));

    await waitFor(() => expect(mockVenue.users.revokeAuthenticator).toHaveBeenCalledWith("did:key:zAuth1", "did:key:zAlice"));
    expect(mockNotifySuccess).toHaveBeenCalled();
  });
});
