import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/use-command-palette-data", () => ({
  useCommandPaletteData: jest.fn(),
}));

import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { useCommandPaletteData } from "@/hooks/use-command-palette-data";
import type { PaletteItem } from "@/lib/command-palette";

const mockUseCommandPaletteData = useCommandPaletteData as jest.MockedFunction<
  typeof useCommandPaletteData
>;

const venueA = { venueId: "v1", baseUrl: "http://a.test", metadata: { name: "Venue A" } };

function itemFixture(overrides: Partial<PaletteItem> = {}): PaletteItem {
  return {
    kind: "asset",
    id: "a1",
    title: "My Asset",
    venueId: "v1",
    venueName: "Venue A",
    href: "/venues/v1/assets/a1",
    requiresVenueSwitch: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockPush.mockClear();
  useCommandPalette.setState({ open: false, recentItems: [] });
  useVenues.setState({ venues: [venueA], selectedVenueId: "v1", selectVenue: jest.fn() });
  useAuthStore.setState({ authMap: {} });
  mockUseCommandPaletteData.mockReturnValue({ items: [], refreshing: false, unreachableVenueIds: [] });
});

it("opens on Ctrl/Cmd+K and closes on Escape", async () => {
  render(<CommandPalette />);
  expect(screen.queryByPlaceholderText(/search everything/i)).not.toBeInTheDocument();

  fireEvent.keyDown(window, { key: "k", metaKey: true });
  expect(screen.getByPlaceholderText(/search everything/i)).toBeInTheDocument();

  fireEvent.keyDown(screen.getByPlaceholderText(/search everything/i), { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByPlaceholderText(/search everything/i)).not.toBeInTheDocument(),
  );
});

it("navigates to a search result and records it as recent", async () => {
  mockUseCommandPaletteData.mockReturnValue({
    items: [itemFixture()],
    refreshing: false,
    unreachableVenueIds: [],
  });
  useCommandPalette.setState({ open: true });
  render(<CommandPalette />);

  const user = userEvent.setup();
  await user.click(screen.getByText("My Asset"));

  expect(mockPush).toHaveBeenCalledWith("/venues/v1/assets/a1");
  expect(useCommandPalette.getState().recentItems[0]).toMatchObject({ id: "a1", kind: "asset" });
  expect(useCommandPalette.getState().open).toBe(false);
});

it("switches venue before navigating when the result requires it", async () => {
  const selectVenue = jest.fn();
  useVenues.setState({ venues: [venueA], selectedVenueId: "v1", selectVenue });
  mockUseCommandPaletteData.mockReturnValue({
    items: [
      itemFixture({
        kind: "agent",
        id: "agent-1",
        title: "agent-1",
        requiresVenueSwitch: true,
        href: "/agents/view?agentId=agent-1",
      }),
    ],
    refreshing: false,
    unreachableVenueIds: [],
  });
  useCommandPalette.setState({ open: true });
  render(<CommandPalette />);

  const user = userEvent.setup();
  await user.click(screen.getByText("agent-1"));

  expect(selectVenue).toHaveBeenCalledWith("v1");
  expect(mockPush).toHaveBeenCalledWith("/agents/view?agentId=agent-1");
});

it("hides a quick action that requires auth when the item's venue is signed out", () => {
  mockUseCommandPaletteData.mockReturnValue({
    items: [
      itemFixture({
        kind: "agent",
        id: "agent-1",
        title: "agent-1",
        requiresVenueSwitch: true,
        href: "/agents/view?agentId=agent-1",
        quickActions: [
          {
            id: "new-chat",
            label: "New chat with agent-1",
            href: "/agents/chat?agentId=agent-1",
            requiresVenueSwitch: true,
            requiresAuth: true,
          },
        ],
      }),
    ],
    refreshing: false,
    unreachableVenueIds: [],
  });
  useCommandPalette.setState({ open: true });
  render(<CommandPalette />);

  expect(screen.getByText("agent-1")).toBeInTheDocument();
  expect(screen.queryByText("New chat with agent-1")).not.toBeInTheDocument();
});

it("gates a quick action on its own item's venue, not the globally selected venue", () => {
  // Regression for a real bug found in manual testing: the globally selected
  // venue ("v1") is signed out, but the result's own venue ("v2") is signed
  // in — the quick action must key off v2's auth, not v1's.
  useVenues.setState({
    venues: [venueA, { venueId: "v2", baseUrl: "http://b.test", metadata: { name: "Venue B" } }],
    selectedVenueId: "v1",
  });
  useAuthStore.setState({
    authMap: { v2: { type: "keypair", privateKeyHex: "x", did: "did:key:z2" } },
  });
  mockUseCommandPaletteData.mockReturnValue({
    items: [
      itemFixture({
        kind: "agent",
        id: "agent-2",
        title: "agent-2",
        venueId: "v2",
        venueName: "Venue B",
        requiresVenueSwitch: true,
        href: "/agents/view?agentId=agent-2",
        quickActions: [
          {
            id: "new-chat",
            label: "New chat with agent-2",
            href: "/agents/chat?agentId=agent-2",
            requiresVenueSwitch: true,
            requiresAuth: true,
          },
        ],
      }),
    ],
    refreshing: false,
    unreachableVenueIds: [],
  });
  useCommandPalette.setState({ open: true });
  render(<CommandPalette />);

  expect(screen.getByText("New chat with agent-2")).toBeInTheDocument();
});

it("hides auth-gated navigation actions when signed out, shows them when signed in", () => {
  useCommandPalette.setState({ open: true });
  const { rerender } = render(<CommandPalette />);
  expect(screen.queryByText("Go to Inbox")).not.toBeInTheDocument();

  act(() => {
    useAuthStore.setState({ authMap: { v1: { type: "keypair", privateKeyHex: "x", did: "did:key:z1" } } });
  });
  rerender(<CommandPalette />);
  expect(screen.getByText("Go to Inbox")).toBeInTheDocument();
});
