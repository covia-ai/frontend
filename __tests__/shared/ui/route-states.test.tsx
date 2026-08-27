import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RouteErrorState } from "@/components/route-states/RouteErrorState";
import { RouteNotFoundState } from "@/components/route-states/RouteNotFoundState";
import { ListPageSkeleton } from "@/components/route-states/ListPageSkeleton";

describe("route states", () => {
  it("offers recovery without exposing an empty crash", () => {
    const reset = jest.fn();
    render(<RouteErrorState error={new Error("Request failed")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "This page could not be loaded" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  it("provides a designed not-found state with a scoped return link", () => {
    render(<RouteNotFoundState title="Agent not found" homeHref="/agents/view" />);

    expect(screen.getByRole("heading", { name: "Agent not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/agents/view");
  });

  it("announces list loading to assistive technology", () => {
    render(<ListPageSkeleton label="jobs" />);
    expect(screen.getByRole("status", { name: "Loading jobs" })).toBeInTheDocument();
  });
});
