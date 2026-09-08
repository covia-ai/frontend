import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { OperationCodeSnippets } from "@/components/OperationCodeSnippets";
import type { OperationInputSchema } from "@/lib/operation-input";

const mockCopy = jest.fn();
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  copyDataToClipBoard: (...args: unknown[]) => mockCopy(...args),
}));

const schema: OperationInputSchema = {
  properties: {
    prompt: { type: "string", examples: ["hello"] },
    apiKey: { type: "string", secret: true },
  },
};

describe("OperationCodeSnippets", () => {
  beforeEach(() => {
    mockCopy.mockClear();
  });

  it("defaults to the curl tab and renders a runnable snippet against the given venue", () => {
    render(
      <OperationCodeSnippets
        baseUrl="https://venue.example"
        assetId="v/ops/test/echo"
        schema={schema}
        liveInput={{}}
      />,
    );

    const curl = screen.getByTestId("snippet-curl");
    expect(curl).toHaveTextContent('curl -X POST "https://venue.example/api/v1/invoke"');
    expect(curl).toHaveTextContent('"operation": "v/ops/test/echo"');
    expect(curl).toHaveTextContent('"prompt": "hello"');
  });

  it("never renders a real value for a secret-marked field, even when one was typed into the Run tab", () => {
    render(
      <OperationCodeSnippets
        baseUrl="https://venue.example"
        assetId="v/ops/test/echo"
        schema={schema}
        liveInput={{ apiKey: "sk-do-not-leak-this" }}
      />,
    );

    const curl = screen.getByTestId("snippet-curl");
    expect(curl).toHaveTextContent('"apiKey": "<apiKey>"');
    expect(curl).not.toHaveTextContent("sk-do-not-leak-this");
  });

  it("switches to the TypeScript tab and shows an @covia/covia-sdk snippet", async () => {
    const user = userEvent.setup();
    render(
      <OperationCodeSnippets
        baseUrl="https://venue.example"
        assetId="v/ops/test/echo"
        schema={schema}
        liveInput={{}}
      />,
    );

    await user.click(screen.getByTestId("snippet-tab-typescript"));

    const ts = screen.getByTestId("snippet-typescript");
    expect(ts).toHaveTextContent('import { Grid } from "@covia/covia-sdk";');
    expect(ts).toHaveTextContent('venue.operations.run("v/ops/test/echo",');
  });

  it("switches to the Python tab and shows a covia-package snippet", async () => {
    const user = userEvent.setup();
    render(
      <OperationCodeSnippets
        baseUrl="https://venue.example"
        assetId="v/ops/test/echo"
        schema={schema}
        liveInput={{}}
      />,
    );

    await user.click(screen.getByTestId("snippet-tab-python"));

    const py = screen.getByTestId("snippet-python");
    expect(py).toHaveTextContent("from covia import Grid");
    expect(py).toHaveTextContent('venue.run("v/ops/test/echo",');
  });

  it("copies the currently selected language's snippet", async () => {
    const user = userEvent.setup();
    render(
      <OperationCodeSnippets
        baseUrl="https://venue.example"
        assetId="v/ops/test/echo"
        schema={schema}
        liveInput={{}}
      />,
    );

    await user.click(screen.getByTestId("snippet-tab-python"));
    await user.click(screen.getByTestId("copy-snippet"));

    expect(mockCopy).toHaveBeenCalledTimes(1);
    const [copiedText, message] = mockCopy.mock.calls[0];
    expect(copiedText).toContain("from covia import Grid");
    expect(message).toBe("Python snippet copied");
  });
});
