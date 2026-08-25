import { act, renderHook, waitFor } from "@testing-library/react";
import { useOperationInput } from "@/hooks/use-operation-input";

const schema = {
  properties: {
    message: { type: "string", default: "hello" },
  },
};

describe("useOperationInput", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("initializes schema defaults and persists edits under a venue-scoped key", async () => {
    const { result } = renderHook(() =>
      useOperationInput("did:venue:one", "v/ops/example", schema),
    );

    await waitFor(() =>
      expect(result.current.input).toEqual({ message: "hello" }),
    );

    act(() => {
      result.current.setValue("message", "updated");
      result.current.setRawValue("message", "updated");
    });

    const key = "operation_input_did:venue:one_v/ops/example";
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(key) ?? "{}")).toMatchObject({
        input: { message: "updated" },
        rawInput: { message: "updated" },
      }),
    );
    expect(
      sessionStorage.getItem("operation_input_did:venue:two_v/ops/example"),
    ).toBeNull();
  });

  // covia-ai/frontend#271: switching a field's type after typing a value
  // must re-coerce the already-stored value into the new type, not just
  // refresh the displayed text — otherwise the submitted payload silently
  // disagrees with what the type selector shows.
  it("re-coerces the stored value when the field's type changes", async () => {
    const { result } = renderHook(() =>
      useOperationInput("did:venue:one", "v/ops/example", schema),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setValue("after", "90000");
      result.current.setRawValue("after", "90000");
    });
    expect((result.current.input as Record<string, unknown>).after).toBe("90000");

    act(() => result.current.setType("after", "number"));

    expect((result.current.input as Record<string, unknown>).after).toBe(90000);
    expect(result.current.rawInput.after).toBe("90000");
    expect(result.current.typeMap.after).toBe("number");
  });

  it("restores persisted state and clears it on reset", async () => {
    const key = "operation_input_did:venue:one_v/ops/example";
    sessionStorage.setItem(
      key,
      JSON.stringify({
        input: { message: "restored" },
        rawInput: { message: "restored" },
        types: { message: "string" },
      }),
    );

    const { result } = renderHook(() =>
      useOperationInput("did:venue:one", "v/ops/example", schema),
    );

    await waitFor(() =>
      expect(result.current.input).toEqual({ message: "restored" }),
    );
    act(() => result.current.reset());

    expect(result.current.input).toEqual({});
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
