import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DefaultAssistantHome } from "@/components/DefaultAssistantHome";

// DefaultAssistantHome's whole job is to mount the Home launchpad; the composer
// contract (fixed assistant, no onChatStarted) now lives in HomeLauncher and is
// asserted in HomeLauncher.test.
jest.mock("@/components/home/HomeLauncher", () => ({
  HomeLauncher: () => <div data-testid="home-launcher" />,
}));

describe("DefaultAssistantHome", () => {
  it("renders the Home launchpad", () => {
    render(<DefaultAssistantHome />);
    expect(screen.getByTestId("home-launcher")).toBeInTheDocument();
  });
});
