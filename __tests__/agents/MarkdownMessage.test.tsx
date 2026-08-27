import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { MarkdownMessage } from "@/components/MarkdownMessage";

describe("MarkdownMessage", () => {
  it("renders GFM structure without flattening it to plain text", () => {
    render(
      <MarkdownMessage>{`## Summary

- **Fast** setup
- ~~Old~~ current

| Item | State |
| --- | --- |
| Chat | Ready |`}</MarkdownMessage>,
    );

    expect(screen.getByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText("Fast").tagName).toBe("STRONG");
    expect(screen.getByText("Old").tagName).toBe("DEL");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("drops raw HTML and blocks unsafe link protocols", () => {
    const { container } = render(
      <MarkdownMessage>{`<img src=x onerror="alert('xss')">

[unsafe](javascript:alert('xss'))`}</MarkdownMessage>,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    const link = screen.getByText("unsafe").closest("a");
    expect(link).not.toHaveAttribute("href", expect.stringContaining("javascript:"));
  });

  it("uses Shiki only after a streamed fence is complete", async () => {
    const user = userEvent.setup();
    const writeText = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    const { rerender } = render(
      <MarkdownMessage>{"```ts\nconst answer: number = 42"}</MarkdownMessage>,
    );

    expect(screen.getByTestId("unhighlighted-code-block")).toBeInTheDocument();
    expect(screen.queryByTestId("highlighted-code-block")).not.toBeInTheDocument();

    rerender(
      <MarkdownMessage>{"```ts\nconst answer: number = 42\n```"}</MarkdownMessage>,
    );

    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByTestId("highlighted-code-block")).toBeInTheDocument(),
      { timeout: 10_000 },
    );
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("const answer: number = 42");
    expect(screen.getByRole("button", { name: "Copy code" })).toHaveTextContent("Copied");
  });

  it("escapes HTML-looking content inside highlighted code", async () => {
    const { container } = render(
      <MarkdownMessage>{"```html\n<img src=x onerror=alert(1)>\n```"}</MarkdownMessage>,
    );

    await waitFor(
      () => expect(screen.getByTestId("highlighted-code-block")).toBeInTheDocument(),
      { timeout: 10_000 },
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("highlighted-code-block")).toHaveTextContent("<img");
  });
});
