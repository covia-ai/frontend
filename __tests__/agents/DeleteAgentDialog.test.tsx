import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { DeleteAgentDialog } from "@/components/agent-explorer/DeleteAgentDialog";

function renderDialog() {
  const onDelete = jest.fn();
  render(<DeleteAgentDialog agentId="writer" onDelete={onDelete} />);
  return { onDelete };
}

describe("DeleteAgentDialog", () => {
  it("terminates with remove=false directly, without a second confirmation", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderDialog();

    await user.click(screen.getByTestId("delete-agent-trigger"));
    await user.click(screen.getByTestId("delete-agent-terminate"));

    expect(onDelete).toHaveBeenCalledWith(false);
  });

  it("requires a second confirmation before removing permanently", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderDialog();

    await user.click(screen.getByTestId("delete-agent-trigger"));
    await user.click(screen.getByTestId("delete-agent-remove-step"));

    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByText('Permanently remove "writer"?'),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("delete-agent-confirm-remove"));
    expect(onDelete).toHaveBeenCalledWith(true);
  });

  it("lets the user step back from the permanent-removal confirmation", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderDialog();

    await user.click(screen.getByTestId("delete-agent-trigger"));
    await user.click(screen.getByTestId("delete-agent-remove-step"));
    await user.click(screen.getByText("Back"));

    await waitFor(() =>
      expect(screen.getByTestId("delete-agent-terminate")).toBeInTheDocument(),
    );
    expect(onDelete).not.toHaveBeenCalled();
  });
});
