import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Covers the optional "C" federation-map view toggle on the venues list. Kept
// in its own file so reverting the map (the C commit) drops this with it and
// leaves the grid tests (VenuesPage.test) intact.

let mockVenues: any[] = [];
jest.mock("@/hooks/use-venues", () => ({
  useVenues: () => ({ venues: mockVenues, selectedVenueId: null }),
}));
jest.mock("@/hooks/use-venue-health", () => ({
  useVenueHealth: (selector: any) => selector({ byUrl: {} }),
}));
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/venues",
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock("@/components/admin-panel/content-layout", () => ({
  ContentLayout: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div /> }));
jest.mock("@/components/ListToolbar", () => ({ ListToolbar: ({ actions }: any) => <div>{actions}</div> }));
jest.mock("@/components/PaginationHeader", () => ({ PaginationHeader: () => <div /> }));
jest.mock("@/components/VenueCard", () => ({
  VenueCard: ({ venue }: any) => <div data-testid="venue-card">{venue.venueId}</div>,
}));
jest.mock("@/components/AddNewVenueModal", () => ({
  AddNewVenueModal: () => <button data-testid="add-venue">Connect to a venue</button>,
}));
jest.mock("@/components/VenueNetworkMap", () => ({
  VenueNetworkMap: ({ venues }: any) => <div data-testid="venues-map" data-count={venues.length} />,
}));

import VenuesPage from "@/app/(demo)/venues/page";

beforeEach(() => {
  mockVenues = [{ venueId: "did:web:a", baseUrl: "https://a", metadata: { name: "Alpha" } }];
});

describe("VenuesPage — federation map view (C)", () => {
  it("defaults to the grid and switches to the map and back", async () => {
    const user = userEvent.setup();
    render(<VenuesPage />);

    // Grid by default.
    expect(screen.getByTestId("venue-card")).toBeInTheDocument();
    expect(screen.queryByTestId("venues-map")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("venues-view-map"));
    expect(screen.getByTestId("venues-map")).toHaveAttribute("data-count", "1");
    expect(screen.queryByTestId("venue-card")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("venues-view-grid"));
    expect(screen.getByTestId("venue-card")).toBeInTheDocument();
    expect(screen.queryByTestId("venues-map")).not.toBeInTheDocument();
  });
});
