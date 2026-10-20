import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { LazyMarkdownMessage } from "@/components/LazyMarkdownMessage";
import { warmMarkdownPipeline } from "@test/lazy-boundaries";

// Compile the lazy module before the clock starts — see @test/lazy-boundaries.
beforeAll(warmMarkdownPipeline);

describe("LazyMarkdownMessage (#473)", () => {
  it("renders the Markdown once the pipeline has loaded", async () => {
    render(<LazyMarkdownMessage className="text-sm">{"## Plan\n\n- **one**"}</LazyMarkdownMessage>);

    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByText("one").tagName).toBe("STRONG");
    expect(screen.getByRole("heading", { name: "Plan" }).closest(".agent-markdown")).toHaveClass("text-sm");
  });

  it("shows the text as-is while it loads, rather than nothing", () => {
    render(<LazyMarkdownMessage>{"plain words"}</LazyMarkdownMessage>);
    expect(screen.getByText("plain words")).toBeInTheDocument();
  });
});

// The point of #473 is that these heavy modules stay out of pages' initial JS.
// One static import from anywhere else would quietly undo it, so pin who may
// import them.
describe("Markdown and highlighter imports stay lazy (#473)", () => {
  const SRC = join(__dirname, "../../src");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  const importersOf = (pattern: RegExp) =>
    files(SRC)
      .filter((path) => pattern.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(SRC.length + 1))
      .sort();

  it("imports the shiki highlighter only dynamically", () => {
    expect(importersOf(/from\s+["']@\/lib\/shiki["']/)).toEqual([]);
  });

  it("reaches react-markdown only through MarkdownBody", () => {
    expect(importersOf(/from\s+["']react-markdown["']/)).toEqual(["components/MarkdownBody.tsx"]);
  });

  it("loads MarkdownMessage in client code only through the lazy wrapper", () => {
    expect(importersOf(/from\s+["']@\/components\/MarkdownMessage["']/)).toEqual([]);
  });
});
