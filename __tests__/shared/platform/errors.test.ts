import { errorMessage, isJobNotFoundError, isNotFoundError } from "@/lib/errors";

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

  // covia 0.11 answers a job id it cannot parse with 400.
  it("treats a malformed job id's 400 as a job that will never be found", () => {
    expect(isJobNotFoundError({ statusCode: 400, message: "Job request requires a job ID as a valid hex string" })).toBe(true);
    expect(isJobNotFoundError({ statusCode: 404 })).toBe(true);
    expect(isJobNotFoundError({ statusCode: 403 })).toBe(false);
    expect(isNotFoundError({ statusCode: 400 })).toBe(false);
  });
});
