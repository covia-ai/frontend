import { friendlyError } from "@/lib/utils";

// An upstream model provider rejecting the venue's API key, as the venue's job
// state machine reports it (covia-ai/frontend: raw JSON blob shown to users).
const UPSTREAM_AUTH_ERROR =
  'Transition failed: {"type":"error","error":{"type":"authentication_error","message":"API key is invalid."},"request_id":null}';

describe("friendlyError", () => {
  it("classifies an upstream authentication failure like any other auth error", () => {
    expect(friendlyError(UPSTREAM_AUTH_ERROR).summary).toBe(
      friendlyError("401 Unauthorized").summary,
    );
  });

  it("surfaces the upstream message instead of the raw JSON envelope", () => {
    const { detail } = friendlyError(UPSTREAM_AUTH_ERROR);
    expect(detail).toBe("API key is invalid.");
    expect(detail).not.toContain("{");
  });

  it("falls back to the raw error when nothing is embedded", () => {
    expect(friendlyError("connection reset by peer").detail).toBe(
      "connection reset by peer",
    );
  });

  it("falls back to the raw error when the embedded payload is unparseable", () => {
    const malformed = 'Transition failed: {"type":"error",';
    expect(friendlyError(malformed).detail).toBe(malformed);
  });

  it("does not classify an unrelated failure as an auth error", () => {
    expect(friendlyError("connection reset by peer").summary).not.toBe(
      friendlyError("401 Unauthorized").summary,
    );
  });
});
