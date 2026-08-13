import { errorMessage, isNotFoundError } from "@/lib/errors";

describe("error helpers", () => {
  it.each([
    new Error("Asset not found: abc"),
    "Request failed with HTTP 404",
    { status: 404 },
    { response: { status: 404 } },
    { code: "NOT_FOUND" },
    { name: "JobNotFoundError" },
    { cause: { statusCode: 404 } },
  ])("recognizes not-found errors across SDK and HTTP shapes", (error) => {
    expect(isNotFoundError(error)).toBe(true);
  });

  it("does not classify unrelated failures as missing resources", () => {
    expect(isNotFoundError(new Error("Failed to fetch"))).toBe(false);
  });

  it("provides a stable fallback for non-error values", () => {
    expect(errorMessage({ reason: "nope" }, "Unable to load asset")).toBe("Unable to load asset");
  });
});
