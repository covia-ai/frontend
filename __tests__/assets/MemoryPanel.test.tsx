import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
}));

let mockAuthenticated = true;
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => mockAuthenticated,
}));

const mockVenue: any = {
  baseUrl: "https://venue.example",
  workspace: { read: jest.fn() },
  operations: { run: jest.fn() },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { MemoryPanel } from "@/components/MemoryPanel";

describe("MemoryPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticated = true;
    mockVenue.workspace.read.mockResolvedValue({ exists: false, value: null });
    mockVenue.operations.run.mockResolvedValue({});
  });

  it("requires authentication", async () => {
    mockAuthenticated = false;
    render(<MemoryPanel />);
    expect(await screen.findByText(/authentication required/i)).toBeInTheDocument();
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
  });

  it("reads w/memory job-free and shows the empty state when there is none", async () => {
    render(<MemoryPanel />);
    await waitFor(() => expect(mockVenue.workspace.read).toHaveBeenCalledWith("w/memory"));
    expect(await screen.findByText(/no memory yet/i)).toBeInTheDocument();
  });

  it("renders existing entries as a numbered list", async () => {
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: [{ text: "Prefers dark mode", ts: 1 }, { text: "Works in UTC+2", ts: 2 }],
    });
    render(<MemoryPanel />);
    expect(await screen.findByText("Prefers dark mode")).toBeInTheDocument();
    expect(screen.getByText("Works in UTC+2")).toBeInTheDocument();
  });

  it("remember appends via the memory op, then reloads the list", async () => {
    const user = userEvent.setup();
    mockVenue.workspace.read
      .mockResolvedValueOnce({ exists: false, value: null })
      .mockResolvedValueOnce({ exists: true, value: [{ text: "New fact" }] });
    render(<MemoryPanel />);
    await screen.findByText(/no memory yet/i);

    await user.type(screen.getByPlaceholderText(/a fact to always keep in view/i), "New fact");
    await user.click(screen.getByRole("button", { name: /^remember$/i }));

    await waitFor(() =>
      expect(mockVenue.operations.run).toHaveBeenCalledWith("v/ops/memory", {
        command: "remember",
        text: "New fact",
      }),
    );
    expect(await screen.findByText("New fact")).toBeInTheDocument();
  });

  it("forget invokes the memory op with the 1-based item number", async () => {
    const user = userEvent.setup();
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: [{ text: "Item one" }, { text: "Item two" }],
    });
    render(<MemoryPanel />);
    await screen.findByText("Item two");

    await user.click(screen.getByRole("button", { name: "Forget item 2" }));
    await user.click(await screen.findByRole("button", { name: /^forget$/i }));

    await waitFor(() =>
      expect(mockVenue.operations.run).toHaveBeenCalledWith("v/ops/memory", { command: "forget", n: 2 }),
    );
  });

  it("surfaces each entry's timestamp (2B R-4 — loaded but previously dropped)", async () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: [{ text: "Prefers dark mode", updated: twoHoursAgo }],
    });
    render(<MemoryPanel />);
    const when = await screen.findByText("2h ago");
    // the absolute time rides along as the hover title
    expect(when).toHaveAttribute("title", new Date(twoHoursAgo).toLocaleString());
  });

  it("search filters the list but forget still keys off the true 1-based index (2B R-5)", async () => {
    const user = userEvent.setup();
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: [{ text: "Apple" }, { text: "Banana" }],
    });
    render(<MemoryPanel />);
    await screen.findByText("Banana");

    await user.type(screen.getByRole("textbox", { name: /search memory/i }), "ban");
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();

    // Banana is the 2nd entry; forgetting it from the filtered view must still
    // pass n:2, not n:1 (its position in the filtered view).
    await user.click(screen.getByRole("button", { name: "Forget item 2" }));
    await user.click(await screen.findByRole("button", { name: /^forget$/i }));
    await waitFor(() =>
      expect(mockVenue.operations.run).toHaveBeenCalledWith("v/ops/memory", { command: "forget", n: 2 }),
    );
  });
});
