import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ForkAgentDialog } from "@/components/agent-explorer/ForkAgentDialog";

// Only the dialog's own logic (default id, reserved-id guard, includeTimeline
// toggle, config-override wiring, close-on-success) is under test here — the
// JSON editing widget itself is covered by ThemedJsonEditor.test.tsx.
jest.mock("@/components/ThemedJsonEditor", () => ({
  ThemedJsonEditor: ({ onChange }: { onChange: (data: unknown) => void }) => (
    <button
      type="button"
      data-testid="mock-config-editor"
      onClick={() => onChange({ systemPrompt: "edited" })}
    >
      edit config
    </button>
  ),
}));

function renderDialog(overrides: Partial<React.ComponentProps<typeof ForkAgentDialog>> = {}) {
  const onFork = jest.fn().mockResolvedValue({ status: "created", agentId: "writer-fork" });
  render(
    <ForkAgentDialog
      sourceAgentId="writer"
      forking={false}
      onFork={onFork}
      {...overrides}
    />,
  );
  return { onFork };
}

describe("ForkAgentDialog", () => {
  it("defaults the new agent id to <source>-fork on open", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByTestId("fork-agent-trigger"));

    expect(screen.getByTestId("fork-agent-id")).toHaveValue("writer-fork");
  });

  it("submits with the trimmed id and includeTimeline, omitting an empty config override", async () => {
    const user = userEvent.setup();
    const { onFork } = renderDialog();

    await user.click(screen.getByTestId("fork-agent-trigger"));
    await user.click(screen.getByTestId("fork-include-timeline"));
    await user.click(screen.getByTestId("fork-agent-submit"));

    await waitFor(() =>
      expect(onFork).toHaveBeenCalledWith({
        agentId: "writer-fork",
        includeTimeline: true,
        config: {},
      }),
    );
  });

  it("passes through an edited config override", async () => {
    const user = userEvent.setup();
    const { onFork } = renderDialog();

    await user.click(screen.getByTestId("fork-agent-trigger"));
    await user.click(screen.getByTestId("fork-config-override-toggle"));
    await user.click(screen.getByTestId("mock-config-editor"));
    await user.click(screen.getByTestId("fork-agent-submit"));

    await waitFor(() =>
      expect(onFork).toHaveBeenCalledWith({
        agentId: "writer-fork",
        includeTimeline: false,
        config: { systemPrompt: "edited" },
      }),
    );
  });

  it("closes the dialog once the fork succeeds", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByTestId("fork-agent-trigger"));
    expect(screen.getByTestId("fork-agent-id")).toBeInTheDocument();

    await user.click(screen.getByTestId("fork-agent-submit"));

    await waitFor(() => expect(screen.queryByTestId("fork-agent-id")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and does not call onFork when the id is the reserved default agent id", async () => {
    const user = userEvent.setup();
    const { onFork } = renderDialog();

    await user.click(screen.getByTestId("fork-agent-trigger"));
    const input = screen.getByTestId("fork-agent-id");
    await user.clear(input);
    await user.type(input, "assistant");

    expect(screen.getByTestId("fork-agent-submit")).toBeDisabled();
    expect(onFork).not.toHaveBeenCalled();
  });

  it("disables submit while a fork is already in flight", async () => {
    const user = userEvent.setup();
    renderDialog({ forking: true });

    await user.click(screen.getByTestId("fork-agent-trigger"));

    expect(screen.getByTestId("fork-agent-submit")).toBeDisabled();
  });
});
