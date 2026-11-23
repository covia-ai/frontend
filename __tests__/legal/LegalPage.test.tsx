import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/content-layout", () => ({
  ContentLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div data-testid="top-bar" /> }));

import { LegalPage } from "@/components/LegalPage";

describe("LegalPage", () => {
  it("renders the heading, the markdown body, and any children", () => {
    render(
      <LegalPage text="Terms of" highlight="service" markdown={"# Heading\n\nThe body of the document."}>
        <div data-testid="extra-section">extra</div>
      </LegalPage>,
    );
    // PageHeading highlight
    expect(screen.getByText("service")).toBeInTheDocument();
    // markdown rendered (not shown as a raw string)
    expect(screen.getByText(/The body of the document\./)).toBeInTheDocument();
    // extra section (e.g. the cookie-preferences block on the privacy page)
    expect(screen.getByTestId("extra-section")).toBeInTheDocument();
  });
});
