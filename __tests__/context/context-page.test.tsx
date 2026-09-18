import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/hooks/use-auth", () => ({
  ...require("@test/use-auth").authMock,
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
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => mockVenue,
}));

import ContextPage from "@/app/(demo)/context/page";

describe("ContextPage", () => {
  it("shows the tier overview and the Memory panel rendered by default (#228 AC1 + AC3)", async () => {
    render(<ContextPage />);

    // AC1 — tier framing is visible without any interaction.
    expect(screen.getByTestId("context-tiers")).toBeInTheDocument();
    expect(screen.getByText("User Memory")).toBeInTheDocument();
    expect(screen.getByText("Venue Shared")).toBeInTheDocument();

    // AC3 — Memory is the default view. 2B dropped the single-"Memory"-tab
    // Tabs shell (a tab bar that can't switch reads as broken), so Memory now
    // renders directly under its section heading rather than behind a selected
    // tab. The spirit of AC3 holds: Memory is what you see without interacting.
    expect(screen.getByRole("heading", { name: "Memory" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^Remember$/ })).toBeInTheDocument();
  });
});
