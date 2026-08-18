import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

import { Sparkline } from "@/components/charts/Sparkline";

describe("Sparkline", () => {
  it("renders an accessible image role with the given label", () => {
    render(
      <Sparkline
        data={[{ label: "a", value: 1 }, { label: "b", value: 2 }]}
        formatValue={(v) => `${v}%`}
        ariaLabel="Success rate trend"
      />,
    );
    expect(screen.getByRole("img", { name: "Success rate trend" })).toBeInTheDocument();
  });

  it("does not throw when every value is null", () => {
    expect(() =>
      render(
        <Sparkline
          data={[{ label: "a", value: null }, { label: "b", value: null }]}
          formatValue={(v) => `${v}`}
          ariaLabel="All-empty trend"
        />,
      ),
    ).not.toThrow();
    expect(screen.getByRole("img", { name: "All-empty trend" })).toBeInTheDocument();
  });
});
