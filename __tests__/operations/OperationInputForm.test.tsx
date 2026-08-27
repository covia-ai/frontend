import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OperationInputForm } from "@/components/OperationInputForm";
import type { OperationInputController } from "@/hooks/use-operation-input";

function controller(input: unknown): OperationInputController {
  return {
    ready: true,
    input,
    rawInput: {},
    typeMap: {},
    setValue: jest.fn(),
    setRawValue: jest.fn(),
    setType: jest.fn(),
    reset: jest.fn(),
  };
}

describe("OperationInputForm", () => {
  it("shows an object editor for an unconstrained object schema", async () => {
    const onRun = jest.fn();
    const user = userEvent.setup();

    render(
      <OperationInputForm
        schema={{ type: "object" }}
        controller={controller({})}
        errorMessage=""
        loading={false}
        confirmationRequired={false}
        isAuthenticated
        onRun={onRun}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("{}");
    expect(screen.getByRole("combobox")).toHaveTextContent("object");
    expect(screen.getByRole("button", { name: "invoke operation" })).toHaveTextContent("Run");

    await user.click(screen.getByRole("button", { name: "invoke operation" }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});
