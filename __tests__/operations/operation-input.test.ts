import {
  defaultsFromOperationSchema,
  parseOperationInput,
  printOperationInput,
  validateOperationInput,
} from "@/lib/operation-input";

describe("operation input conversion", () => {
  it("parses structured and numeric input", () => {
    expect(parseOperationInput('{"enabled":true}', "object")).toEqual({
      enabled: true,
    });
    expect(parseOperationInput("[1,2]", "array")).toEqual([1, 2]);
    expect(parseOperationInput("42.5", "number")).toBe(42.5);
    expect(parseOperationInput("plain text", "string")).toBe("plain text");
  });

  it("prints values in the editor representation for their selected type", () => {
    expect(printOperationInput({ enabled: true }, "json")).toBe(
      '{\n  "enabled": true\n}',
    );
    expect(printOperationInput(undefined, "array")).toBe("[]");
    expect(printOperationInput(undefined, "object")).toBe("{}");
    expect(printOperationInput(0, "number")).toBe("0");
    expect(printOperationInput(false, "string")).toBe("false");
  });

  it("derives defaults and declared types without dropping falsey defaults", () => {
    expect(
      defaultsFromOperationSchema({
        properties: {
          enabled: { type: "string", default: false },
          retries: { type: "number", default: 0 },
          optional: { type: "string" },
        },
      }),
    ).toEqual({
      input: { enabled: false, retries: 0 },
      types: {
        enabled: "string",
        retries: "number",
        optional: "string",
      },
    });
  });
});

describe("operation input validation", () => {
  it("rejects empty input and names missing required fields", () => {
    expect(validateOperationInput({}, [])).toMatch(/No inputs provided/);
    expect(validateOperationInput({ optional: true }, ["required"])).toContain(
      '"required"',
    );
  });

  it("accepts complete objects and scalar values", () => {
    expect(
      validateOperationInput({ required: 0 }, ["required"]),
    ).toBeNull();
    expect(validateOperationInput(0, [])).toBeNull();
  });
});
