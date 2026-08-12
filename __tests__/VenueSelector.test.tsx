import { render, screen } from "@testing-library/react";
import { VenueSelector } from "@/components/VenueSelector";

const mockSelectVenue = jest.fn();
let mockVenueState = {
  venues: [] as Array<{
    venueId: string;
    baseUrl: string;
    metadata: { name?: string; description?: string };
  }>,
  selectedVenueId: null as string | null,
  selectVenue: mockSelectVenue,
};

jest.mock("@/hooks/use-venues", () => ({
  useVenues: (selector: (state: typeof mockVenueState) => unknown) =>
    selector(mockVenueState),
}));

jest.mock("@/components/VenueHealthDot", () => ({
  VenueHealthDot: () => <span data-testid="venue-health-dot" />,
}));

describe("VenueSelector", () => {
  beforeEach(() => {
    mockVenueState = {
      venues: [],
      selectedVenueId: null,
      selectVenue: mockSelectVenue,
    };
  });

  it("shows the host instead of a DID-like metadata name", () => {
    const venueId = "did:web:venue-test.covia.ai";
    mockVenueState = {
      ...mockVenueState,
      selectedVenueId: venueId,
      venues: [
        {
          venueId,
          baseUrl: "https://venue-test.covia.ai",
          metadata: { name: venueId },
        },
      ],
    };

    render(<VenueSelector />);

    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent(
      "venue-test.covia.ai",
    );
    expect(screen.getByRole("button", { name: "venue" })).not.toHaveTextContent(
      venueId,
    );
  });

  it("does not expose a route DID while its venue is resolving", () => {
    const venueId = "did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR";

    render(<VenueSelector venueId={venueId} />);

    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent(
      "Resolving venue…",
    );
    expect(screen.queryByText(venueId)).not.toBeInTheDocument();
  });
});
