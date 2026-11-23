import { act, render, screen } from "@testing-library/react";
import { VenueSelector } from "@/components/VenueSelector";
import { reportVenueHealth, useVenueHealth } from "@/hooks/use-venue-health";

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

let mockHydrated = true;
jest.mock("@/hooks/use-venues", () => ({
  useVenues: (selector: (state: typeof mockVenueState) => unknown) =>
    selector(mockVenueState),
  useVenuesHydrated: () => mockHydrated,
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
    mockHydrated = true;
    act(() => useVenueHealth.setState({ byUrl: {} }));
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
    const venueId = "did:web:routed.example";

    render(<VenueSelector venueId={venueId} />);

    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent(
      "Resolving venue…",
    );
    expect(screen.queryByText(venueId)).not.toBeInTheDocument();
  });

  it("matches an encoded route segment to the stored venue DID", () => {
    const venueId = "did:web:venue-test.covia.ai";
    mockVenueState = {
      ...mockVenueState,
      venues: [
        {
          venueId,
          baseUrl: "https://venue-test.covia.ai",
          metadata: { name: "Covia Test" },
        },
      ],
    };

    render(<VenueSelector venueId={encodeURIComponent(venueId)} />);

    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent(
      "Covia Test",
    );
    expect(screen.getByRole("button", { name: "venue" })).not.toHaveTextContent(
      "Resolving venue…",
    );
  });

  // #467: once the page's resolution fails, the selector must stop saying
  // "Resolving venue…" and say why.
  it("shows an unavailable venue, with the reason, once its connect failed", () => {
    const venueId = "did:web:down.example";
    act(() => reportVenueHealth(venueId, { state: "unreachable", detail: "connection refused" }));

    render(<VenueSelector venueId={venueId} />);

    const button = screen.getByRole("button", { name: "venue" });
    expect(button).toHaveTextContent("Venue unavailable");
    expect(button).not.toHaveTextContent("Resolving venue…");
    expect(button).toHaveAttribute("title", "connection refused");
  });

  it("finds the failure under the encoded route segment too", () => {
    const venueId = "did:web:localhost%3A8080";
    act(() => reportVenueHealth(venueId, { state: "unreachable", detail: "connection refused" }));

    render(<VenueSelector venueId={venueId} />);

    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent("Venue unavailable");
  });

  it("calls an unknown did:key unavailable once the venue list has loaded", () => {
    const venueId = "did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR";

    render(<VenueSelector venueId={venueId} />);

    const button = screen.getByRole("button", { name: "venue" });
    expect(button).toHaveTextContent("Venue unavailable");
    expect(button.getAttribute("title")).toMatch(/isn't in your venue list/);
    expect(screen.queryByText(venueId)).not.toBeInTheDocument();
  });

  it("keeps resolving while the venue list loads, or while the connect is in flight", () => {
    const key = "did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR";
    mockHydrated = false;
    const { unmount } = render(<VenueSelector venueId={key} />);
    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent("Resolving venue…");
    unmount();

    mockHydrated = true;
    act(() => reportVenueHealth("did:web:slow.example", { state: "connecting" }));
    render(<VenueSelector venueId="did:web:slow.example" />);
    expect(screen.getByRole("button", { name: "venue" })).toHaveTextContent("Resolving venue…");
  });
});
