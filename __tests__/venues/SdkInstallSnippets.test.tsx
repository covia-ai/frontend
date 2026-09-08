import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockCopy = jest.fn();
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  copyDataToClipBoard: (...args: unknown[]) => mockCopy(...args),
}));

import { SdkInstallSnippets } from "@/components/venue/SdkInstallSnippets";

describe("SdkInstallSnippets", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the install command and copies it", async () => {
    render(<SdkInstallSnippets baseUrl="https://venue.example" />);
    const user = userEvent.setup();

    expect(screen.getByText("npm install @covia/covia-sdk")).toBeInTheDocument();

    const copyButtons = screen.getAllByText("Copy");
    await user.click(copyButtons[0]);

    expect(mockCopy).toHaveBeenCalledWith("npm install @covia/covia-sdk", "Install command copied");
  });

  it("interpolates the venue baseUrl into the quickstart snippet and copies it", async () => {
    render(<SdkInstallSnippets baseUrl="https://venue.example" />);
    const user = userEvent.setup();

    const quickstart = screen.getByText(/Venue\.connect/);
    expect(quickstart).toHaveTextContent('"https://venue.example"');

    const copyButtons = screen.getAllByText("Copy");
    await user.click(copyButtons[1]);

    const [copiedText, message] = mockCopy.mock.calls[0];
    expect(copiedText).toContain('Venue.connect("https://venue.example")');
    expect(message).toBe("Quickstart snippet copied");
  });
});
