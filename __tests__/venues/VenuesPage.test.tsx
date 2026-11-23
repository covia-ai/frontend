import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockVenues: any[] = [];
let mockSelected: string | null = null;
jest.mock("@/hooks/use-venues", () => ({
  useVenues: () => ({ venues: mockVenues, selectedVenueId: mockSelected }),
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

const V = (id: string, name?: string) => ({
  venueId: id,
  baseUrl: `https://${id}`,
  metadata: name ? { name } : {},
});

beforeEach(() => {
  mockVenues = [];
  mockSelected = null;
});

describe("VenuesPage", () => {
  it("shows a real empty state (not a blank grid) when there are no venues", () => {
    render(<VenuesPage />);
    expect(screen.getByText("No venues connected")).toBeInTheDocument();
    expect(screen.queryByTestId("venues-network-bar")).not.toBeInTheDocument();
  });

  it("shows the network header and the venue grid when venues exist", () => {
    mockVenues = [V("did:web:a", "Alpha"), V("did:web:b")];
    mockSelected = "did:web:a";
    render(<VenuesPage />);
    const bar = screen.getByTestId("venues-network-bar");
    expect(bar).toHaveTextContent("2");
    expect(bar).toHaveTextContent("venues");
    expect(bar).toHaveTextContent("Alpha"); // the default
    expect(screen.getAllByTestId("venue-card")).toHaveLength(2);
  });
});
