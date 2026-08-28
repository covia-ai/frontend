import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
}));
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => true,
}));
jest.mock("@/components/admin-panel/signin-button", () => ({
  ChromeSignInButton: () => <div data-testid="chrome-sign-in-button" />,
}));
const mockVenue: any = {
  baseUrl: "https://venue.example",
  workspace: { read: jest.fn().mockResolvedValue({ exists: false, value: null }) },
  operations: { run: jest.fn() },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import ContextPage from "@/app/(demo)/context/page";

describe("ContextPage", () => {
  it("shows the tier overview and the Memory tab open by default (#228 AC1 + AC3)", async () => {
    render(<ContextPage />);

    // AC1 — tier framing is visible without any interaction.
    expect(screen.getByTestId("context-tiers")).toBeInTheDocument();
    expect(screen.getByText("User Memory")).toBeInTheDocument();
    expect(screen.getByText("Venue Shared")).toBeInTheDocument();

    // AC3 — the Memory tab is the default, already-open tab.
    const memoryTab = screen.getByRole("tab", { name: "Memory" });
    expect(memoryTab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("button", { name: /^Remember$/ })).toBeInTheDocument();
  });
});
