import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);

const listMock = jest.fn();
const mockVenue = {
  venueId: "did:web:venue.example",
  baseUrl: "https://venue.example",
  metadata: { name: "Test Venue" },
  adapters: { list: listMock },
};
const mockResolved = { venue: mockVenue as unknown, auth: null, status: "ready", error: null };
jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => mockResolved,
}));

import { AdaptersList } from "@/components/AdaptersList";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";

describe("AdaptersList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockResolved, { venue: mockVenue, status: "ready" });
    listMock.mockResolvedValue([
      { name: "langchain", description: "LangChain adapter", operations: ["v/ops/langchain/models", "v/ops/langchain/chat"] },
      { name: "http", description: "HTTP fetch", operations: ["v/ops/http/get"] },
    ]);
  });

  it("lists adapters with name, description, op count and the registered total", async () => {
    render(<AdaptersList venueId="did:web:venue.example" />);
    expect(await screen.findByText("langchain")).toBeInTheDocument();
    expect(screen.getByText("LangChain adapter")).toBeInTheDocument();
    expect(screen.getByText("2 ops")).toBeInTheDocument();
    expect(screen.getByText("1 op")).toBeInTheDocument();
    expect(screen.getByText("2 adapters registered")).toBeInTheDocument();
    // Each adapter carries a brand glyph (TypeTile) — an svg in its cell.
    expect(screen.getByText("langchain").closest("span")?.querySelector("svg")).toBeTruthy();
  });

  it("filters by name/description", async () => {
    const user = userEvent.setup();
    render(<AdaptersList venueId="did:web:venue.example" />);
    await screen.findByText("langchain");

    await user.type(screen.getByPlaceholderText(/filter adapters/i), "fetch");
    expect(screen.queryByText("langchain")).not.toBeInTheDocument();
    expect(screen.getByText("http")).toBeInTheDocument();
  });

  it("expands to its operations and navigates to the operation on click", async () => {
    const user = userEvent.setup();
    render(<AdaptersList venueId="did:web:venue.example" />);
    await user.click(await screen.findByText("langchain"));

    const op = await screen.findByText("v/ops/langchain/chat");
    await user.click(op);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/operations/v/ops/langchain/chat"),
    );
  });

  it("shows a load error — not the empty state — when the read fails", async () => {
    const failure = new Error("HTTP 503");
    listMock.mockRejectedValue(failure);
    render(<AdaptersList venueId="did:web:venue.example" />);

    expect(await screen.findByTestId("adapters-load-error")).toBeInTheDocument();
    // A failed read is a venue-health signal, so it forces a status recheck.
    expect(revalidateVenueOnFailure).toHaveBeenCalledWith(mockVenue, null, failure);

    // Retry re-reads and recovers without a page reload.
    listMock.mockResolvedValue([{ name: "http", description: "HTTP fetch", operations: [] }]);
    await userEvent.click(screen.getByTestId("list-load-retry"));
    await waitFor(() => expect(screen.queryByTestId("adapters-load-error")).not.toBeInTheDocument());
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("hands over to the venue resolution state instead of spinning when the venue never resolves", () => {
    Object.assign(mockResolved, { venue: undefined, status: "unreachable" });
    render(<AdaptersList venueId="did:web:gone.example" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });
});
