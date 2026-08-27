import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Activity } from "lucide-react";

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

import { StatTile } from "@/components/StatTile";

describe("StatTile", () => {
  it("renders label, value and caption without a trend prop, unchanged", () => {
    render(
      <StatTile icon={Activity} label="Total Jobs" value="42" caption="for this user" />,
    );
    expect(screen.getByText("Total Jobs")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("for this user")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders a sparkline when trend data is passed", () => {
    render(
      <StatTile
        icon={Activity}
        label="Success Rate"
        value="80%"
        trend={{
          data: [{ label: "a", value: 60 }, { label: "b", value: 80 }],
          formatValue: (v) => `${v}%`,
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Success Rate trend" })).toBeInTheDocument();
  });
});
