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

describe("boolean inputs (frontend#553)", () => {
  it("parses true and false to real booleans, and empty to not set", () => {
    expect(parseOperationInput("true", "boolean")).toBe(true);
    expect(parseOperationInput("false", "boolean")).toBe(false);
    expect(parseOperationInput(" TRUE ", "boolean")).toBe(true);
    expect(parseOperationInput("", "boolean")).toBeUndefined();
  });

  it("rejects anything else rather than sending it", () => {
    expect(() => parseOperationInput("yes", "boolean")).toThrow(/true or false/);
    expect(() => parseOperationInput("1", "boolean")).toThrow();
  });

  it("prints booleans and leaves anything else as not set", () => {
    expect(printOperationInput(true, "boolean")).toBe("true");
    expect(printOperationInput(false, "boolean")).toBe("false");
    expect(printOperationInput("true", "boolean")).toBe("true");
    expect(printOperationInput(undefined, "boolean")).toBe("");
    expect(printOperationInput("maybe", "boolean")).toBe("");
  });

  it("keeps a boolean schema default, including false", () => {
    expect(
      defaultsFromOperationSchema({ properties: { strict: { type: "boolean", default: false } } }),
    ).toEqual({ input: { strict: false }, types: { strict: "boolean" } });
  });
});

describe("integer inputs", () => {
  it("parses whole numbers and rejects fractions or text", () => {
    expect(parseOperationInput("90000", "integer")).toBe(90000);
    expect(() => parseOperationInput("1.5", "integer")).toThrow(/whole number/);
    expect(() => parseOperationInput("soon", "integer")).toThrow();
    expect(printOperationInput(5000, "integer")).toBe("5000");
  });
});

describe("operation input validation", () => {
  it("accepts an empty object when the schema has no required fields", () => {
    expect(validateOperationInput({}, { type: "object" })).toBeNull();
    expect(validateOperationInput({}, {})).toBeNull();
    expect(validateOperationInput({}, {
      type: "object",
      properties: { optional: { type: "string" } },
    })).toBeNull();
  });

  it("rejects missing scalar input and names missing required fields", () => {
    expect(validateOperationInput("", { type: "string" })).toMatch(/No inputs provided/);
    expect(validateOperationInput({ optional: true }, { required: ["required"] })).toContain(
      '"required"',
    );
  });

  it("accepts complete objects and scalar values", () => {
    expect(
      validateOperationInput({ required: 0 }, { required: ["required"] }),
    ).toBeNull();
    expect(validateOperationInput(0, {})).toBeNull();
  });
});
