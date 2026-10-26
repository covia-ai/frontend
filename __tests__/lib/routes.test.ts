import { agentChatPath, jobPath, operationPathSegments, venueScopedHref } from "@/lib/routes";

const VENUE = "did:key:z6MkVenue";
const HASH = "a".repeat(64);

describe("operationPathSegments", () => {
  it("keeps a catalog path as its segments", () => {
    expect(operationPathSegments("v/ops/http/get")).toBe("v/ops/http/get");
  });

  it("strips the DID from a DID URL and encodes each segment", () => {
    expect(operationPathSegments(`${VENUE}/a/${HASH}`)).toBe(`a/${HASH}`);
    expect(operationPathSegments("w/ops/my op#1")).toBe("w/ops/my%20op%231");
  });
});

describe("venueScopedHref", () => {
  it("links an operation by its address segments", () => {
    expect(venueScopedHref(VENUE, "operations", `${VENUE}/v/ops/http/get`))
      .toBe(`/venues/${encodeURIComponent(VENUE)}/operations/v/ops/http/get`);
  });

  it("links an asset by its bare hash, in one segment (frontend#382)", () => {
    expect(venueScopedHref(VENUE, "assets", `${VENUE}/a/${HASH}`))
      .toBe(`/venues/${encodeURIComponent(VENUE)}/assets/${HASH}`);
  });

  it("falls back to the list for a bare DID", () => {
    expect(venueScopedHref(VENUE, "operations", VENUE)).toBe(`/venues/${encodeURIComponent(VENUE)}/operations`);
  });
});

describe("jobPath", () => {
  it("is venue-scoped when the venue is known, the global route otherwise", () => {
    expect(jobPath(VENUE, "0xabc")).toBe(`/venues/${encodeURIComponent(VENUE)}/jobs/0xabc`);
    expect(jobPath(undefined, "0xabc")).toBe("/job/0xabc");
    // An unresolved venue is not a venue: no "/venues//jobs/…".
    expect(jobPath("", "0xabc")).toBe("/job/0xabc");
  });

  it("encodes the id like any path segment", () => {
    expect(jobPath(undefined, "a/b c")).toBe("/job/a%2Fb%20c");
  });
});

describe("agentChatPath", () => {
  it("encodes the agent id into the query", () => {
    expect(agentChatPath("my agent&x")).toBe("/agents/chat?agentId=my%20agent%26x");
  });
});
