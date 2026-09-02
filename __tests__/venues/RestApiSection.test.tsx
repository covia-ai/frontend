import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { RestApiSection } from "@/components/venue/RestApiSection";

describe("RestApiSection", () => {
  it("shows the base URL and links to openapi, swagger, and redoc in new tabs", () => {
    render(<RestApiSection baseUrl="https://venue.example" />);

    expect(screen.getByText("https://venue.example")).toBeInTheDocument();

    const openapi = screen.getByRole("link", { name: /openapi spec/i });
    expect(openapi).toHaveAttribute("href", "https://venue.example/openapi");
    expect(openapi).toHaveAttribute("target", "_blank");

    const swagger = screen.getByRole("link", { name: /swagger ui/i });
    expect(swagger).toHaveAttribute("href", "https://venue.example/swagger");
    expect(swagger).toHaveAttribute("target", "_blank");

    const redoc = screen.getByRole("link", { name: /redoc/i });
    expect(redoc).toHaveAttribute("href", "https://venue.example/redoc");
    expect(redoc).toHaveAttribute("target", "_blank");
  });
});
