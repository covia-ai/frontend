import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { MAX_SUSPEND_REASON, SuspendAgentDialog } from "@/components/agent-explorer/SuspendAgentDialog";

describe("SuspendAgentDialog (covia#590)", () => {
  it("suspends with the reason given", async () => {
    const onSuspend = jest.fn();
    const user = userEvent.setup();
    render(<SuspendAgentDialog agentId="night-watch" onSuspend={onSuspend} />);

    await user.click(screen.getByTestId("suspend-agent-trigger"));
    await user.type(screen.getByTestId("suspend-agent-reason"), "Rotating its key");
    await user.click(screen.getByTestId("suspend-agent-confirm"));

    expect(onSuspend).toHaveBeenCalledWith("Rotating its key");
  });

  it("suspends without a reason, and suspends nothing until confirmed", async () => {
    const onSuspend = jest.fn();
    const user = userEvent.setup();
    render(<SuspendAgentDialog agentId="night-watch" onSuspend={onSuspend} />);

    await user.click(screen.getByTestId("suspend-agent-trigger"));
    expect(onSuspend).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("suspend-agent-confirm"));

    expect(onSuspend).toHaveBeenCalledWith("");
  });

  it("starts each open with an empty reason, capped at the venue's limit", async () => {
    const user = userEvent.setup();
    render(<SuspendAgentDialog agentId="night-watch" onSuspend={jest.fn()} />);

    await user.click(screen.getByTestId("suspend-agent-trigger"));
    await user.type(screen.getByTestId("suspend-agent-reason"), "draft");
    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("suspend-agent-trigger"));

    const field = screen.getByTestId("suspend-agent-reason");
    expect(field).toHaveValue("");
    expect(field).toHaveAttribute("maxLength", String(MAX_SUSPEND_REASON));
  });
});
