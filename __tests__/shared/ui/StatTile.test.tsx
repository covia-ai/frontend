import React from "react";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Activity } from "lucide-react";

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

import { StatTile } from "@/components/StatTile";
import { warmSparkline } from "@test/lazy-boundaries";

// Compile the lazy module before the clock starts — see @test/lazy-boundaries.
beforeAll(warmSparkline);

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

  it("renders a sparkline when trend data is passed", async () => {
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
    expect(await screen.findByRole("img", { name: "Success Rate trend" })).toBeInTheDocument();
  });

});

// #476: recharts is the largest library a page would otherwise load up front.
// A static import of the chart primitives from anywhere outside their folder
// would pull it back into that page's initial JS, so pin who may import them.
describe("chart imports stay lazy (#476)", () => {
  const SRC = join(__dirname, "../../../src");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  const importersOf = (pattern: RegExp) =>
    files(SRC)
      .filter((path) => pattern.test(readFileSync(path, "utf8")))
      .map((path) => relative(SRC, path).split(sep).join("/"))
      .sort();

  it("reaches recharts only from the charts folder", () => {
    expect(importersOf(/from\s+["']recharts["']/).every((p) => p.startsWith("components/charts/"))).toBe(true);
  });

  it("loads the chart primitives only dynamically outside that folder", () => {
    expect(
      importersOf(/^import\s+(?!type\b)[^;]*from\s+["']@\/components\/charts\/(?!chart-theme)/m),
    ).toEqual([]);
  });
});
