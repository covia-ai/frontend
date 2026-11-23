import { awaitingDescription, awaitingHref, awaitingTotal, readAwaiting } from "@/lib/agent-awaiting";

describe("readAwaiting (covia#557)", () => {
  it("reads the venue's {input, auth} counts", () => {
    expect(readAwaiting({ agentId: "a", awaiting: { input: 2, auth: 1 } })).toEqual({ input: 2, auth: 1 });
  });

  it("is undefined, not zero, when the venue predates the field", () => {
    expect(readAwaiting({ agentId: "a", status: "SLEEPING" })).toBeUndefined();
    expect(readAwaiting(undefined)).toBeUndefined();
    expect(readAwaiting({ awaiting: null })).toBeUndefined();
  });

  it("treats junk counts as zero rather than trusting them", () => {
    expect(readAwaiting({ awaiting: { input: "3", auth: -1 } })).toEqual({ input: 0, auth: 0 });
    expect(readAwaiting({ awaiting: { input: Number.NaN } })).toEqual({ input: 0, auth: 0 });
  });
});

describe("awaiting helpers", () => {
  it("totals input and auth", () => {
    expect(awaitingTotal({ input: 2, auth: 1 })).toBe(3);
    expect(awaitingTotal(undefined)).toBe(0);
  });

  it("describes each kind with the right plural", () => {
    expect(awaitingDescription({ input: 1, auth: 0 })).toBe("1 request needs input");
    expect(awaitingDescription({ input: 2, auth: 1 })).toBe("2 requests need input · 1 request needs sign-in");
  });

  it("sends input asks to the agent's inbox requests and auth asks to the job list", () => {
    expect(awaitingHref("team/bot", { input: 1, auth: 1 })).toBe("/inbox?agent=team%2Fbot");
    expect(awaitingHref("bot", { input: 0, auth: 2 })).toBe("/jobs?status=AUTH_REQUIRED");
  });
});
