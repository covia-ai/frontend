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

  describe("boolean fields (frontend#553)", () => {
    const booleanSchema = {
      type: "object",
      properties: { strict: { type: "boolean", description: "Enforce the schema" } },
    };

    function renderBoolean(ctrl: OperationInputController) {
      render(
        <OperationInputForm
          schema={booleanSchema}
          controller={ctrl}
          errorMessage=""
          loading={false}
          confirmationRequired={false}
          isAuthenticated
          onRun={jest.fn()}
        />,
      );
    }

    it("shows a true/false/(not set) control with the boolean type selected", () => {
      renderBoolean(controller({}));
      expect(screen.getByTestId("boolean-input-strict")).toHaveTextContent("(not set)");
      const [, typeSelect] = screen.getAllByRole("combobox");
      expect(typeSelect).toHaveTextContent("boolean");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("sets a real boolean", async () => {
      const user = userEvent.setup();
      const ctrl = controller({});
      renderBoolean(ctrl);

      await user.click(screen.getByTestId("boolean-input-strict"));
      await user.click(await screen.findByRole("option", { name: "true" }));
      expect(ctrl.setValue).toHaveBeenLastCalledWith("strict", true);
      expect(ctrl.setRawValue).toHaveBeenLastCalledWith("strict", "true");
    });

    it("clears a set boolean back to not set", async () => {
      const user = userEvent.setup();
      const ctrl = { ...controller({ strict: true }), rawInput: { strict: "true" } };
      renderBoolean(ctrl);

      await user.click(screen.getByTestId("boolean-input-strict"));
      await user.click(await screen.findByRole("option", { name: "(not set)" }));
      expect(ctrl.setValue).toHaveBeenLastCalledWith("strict", undefined);
      expect(ctrl.setRawValue).toHaveBeenLastCalledWith("strict", "");
    });

    it("shows a stored value", () => {
      renderBoolean({ ...controller({ strict: false }), rawInput: { strict: "false" } });
      expect(screen.getByTestId("boolean-input-strict")).toHaveTextContent("false");
    });
  });
});
