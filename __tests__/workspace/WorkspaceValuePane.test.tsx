import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { WorkspaceValuePane } from "@/components/workspace/WorkspaceValuePane";
import type { WorkspaceValue } from "@/hooks/use-workspace-explorer";

const onSave = jest.fn().mockResolvedValue(true);

function renderPane(selectedValue: WorkspaceValue) {
  return render(
    <WorkspaceValuePane
      currentPath="w"
      selectedPath="w/key"
      namespaceEmpty={false}
      selectedValue={selectedValue}
      loading={false}
      error={null}
      isAuthenticated
      pendingMutation={null}
      onSave={onSave}
      onDelete={jest.fn()}
    />,
  );
}

describe("WorkspaceValuePane scalar editing", () => {
  beforeEach(() => onSave.mockClear());

  it("keeps the text as typed and only turns it into a value on blur", async () => {
    const user = userEvent.setup();
    renderPane({ exists: true, value: 1, type: "number" });
    const editor = screen.getByRole("textbox");

    await user.clear(editor);
    await user.type(editor, "1.05");

    // Parsing per keystroke used to collapse this at "1.0" → 1.
    expect(editor).toHaveValue("1.05");
    expect(onSave).not.toHaveBeenCalled();

    await user.tab();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(1.05);
  });

  it("saves an edited numeric-looking string as a string", async () => {
    const user = userEvent.setup();
    renderPane({ exists: true, value: "123", type: "string" });

    await user.type(screen.getByRole("textbox"), "4");
    await user.tab();

    expect(onSave).toHaveBeenCalledWith("1234");
  });

  it("hands back an equal value when nothing was edited, so the save is a no-op", async () => {
    const user = userEvent.setup();
    renderPane({ exists: true, value: "123", type: "string" });

    await user.click(screen.getByRole("textbox"));
    await user.tab();

    expect(onSave).toHaveBeenCalledWith("123");
  });

  it("shows a truncated value read-only, with a marker, but still deletable", () => {
    renderPane({ exists: true, value: "the first part of", type: "string", truncated: true });

    expect(screen.getByTestId("workspace-value-truncated")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    // The pane's only button is delete — removing a key never writes a value.
    expect(screen.getByRole("button")).toBeEnabled();
  });
});
