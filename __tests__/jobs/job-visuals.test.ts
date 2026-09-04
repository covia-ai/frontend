import { RunStatus } from "@covia/covia-sdk";
import {
  operationVisual,
  abbreviateJobId,
  jobDurationMs,
  percentile,
  durationFillClass,
  statusVisual,
} from "@/lib/job-visuals";

describe("operationVisual — operation → icon identity", () => {
  it("reads the v/ops/<adapter>/<op> form", () => {
    expect(operationVisual({ operation: "v/ops/http/get" }).kind).toBe("http");
    expect(operationVisual({ operation: "v/ops/secret/set" }).kind).toBe("secret");
    expect(operationVisual({ operation: "v/ops/agent/create" }).kind).toBe("agent");
  });

  it("reads the v/<adapter>/ops/<op> form (e.g. test ops)", () => {
    expect(operationVisual({ operation: "v/test/ops/echo" }).kind).toBe("test");
    expect(operationVisual({ operation: "v/test/ops/error" }).kind).toBe("test");
  });

  it("handles DID-scoped and model paths, and bare shorthand", () => {
    expect(operationVisual({ operation: "did:key:z6Mk/v/test/ops/echo" }).kind).toBe("test");
    expect(operationVisual({ operation: "did:key:z6Mk/v/ops/http/get" }).kind).toBe("http");
    expect(operationVisual({ operation: "v/models/anthropic/claude-sonnet-5" }).kind).toBe("model");
    expect(operationVisual({ operation: "agent:create" }).kind).toBe("agent");
  });

  it("falls back to the job name when there is no operation path", () => {
    expect(operationVisual({ name: "Set Secret" }).kind).toBe("secret");
    expect(operationVisual({ name: "HTTP GET Operation" }).kind).toBe("http");
    expect(operationVisual({ name: "Create Agent" }).kind).toBe("agent");
  });

  it("is generic when nothing matches", () => {
    expect(operationVisual({ name: "Echo Operation" }).kind).toBe("operation");
    expect(operationVisual({}).kind).toBe("operation");
  });

  it("always returns an icon and a class", () => {
    const v = operationVisual({ operation: "v/ops/http/get" });
    expect(v.Icon).toBeDefined();
    expect(typeof v.className).toBe("string");
  });
});

describe("abbreviateJobId", () => {
  it("elides long hex ids keeping both ends", () => {
    expect(abbreviateJobId("0x01a05fa1d46700006d964feca62a2fd9")).toBe("0x01a05f…2fd9");
  });
  it("passes short ids through and handles undefined", () => {
    expect(abbreviateJobId("0x0123")).toBe("0x0123");
    expect(abbreviateJobId(undefined)).toBe("--");
  });
});

describe("jobDurationMs", () => {
  it("computes elapsed ms for a terminal job", () => {
    expect(jobDurationMs({ created: "2026-09-04T00:00:00.000Z", updated: "2026-09-04T00:00:00.355Z" })).toBe(355);
  });
  it("returns null when timestamps are missing or negative", () => {
    expect(jobDurationMs({ created: "2026-09-04T00:00:00.000Z" })).toBeNull();
    expect(jobDurationMs({})).toBeNull();
    expect(jobDurationMs({ created: "2026-09-04T00:00:01.000Z", updated: "2026-09-04T00:00:00.000Z" })).toBeNull();
  });
});

describe("percentile", () => {
  it("interpolates p50 and p95", () => {
    const xs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(xs, 50)).toBeCloseTo(55, 5);
    expect(percentile(xs, 95)).toBeCloseTo(95.5, 5);
  });
  it("handles empty and single-element arrays", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([42], 95)).toBe(42);
  });
});

describe("durationFillClass — latency band → colour", () => {
  it("greens fast, reds very slow", () => {
    expect(durationFillClass(100)).toContain("green");
    expect(durationFillClass(1200)).toContain("cyan");
    expect(durationFillClass(4000)).toContain("amber");
    expect(durationFillClass(20000)).toContain("destructive");
  });
});

describe("statusVisual — status → tone/icon", () => {
  it("maps terminal states to the right tone", () => {
    expect(statusVisual(RunStatus.COMPLETE).tone).toBe("success");
    expect(statusVisual(RunStatus.FAILED).tone).toBe("failure");
    expect(statusVisual(RunStatus.CANCELLED).tone).toBe("neutral");
    expect(statusVisual(RunStatus.INPUT_REQUIRED).tone).toBe("attention");
  });
  it("spins for in-flight states and carries the label", () => {
    expect(statusVisual(RunStatus.STARTED).spin).toBe(true);
    expect(statusVisual(RunStatus.COMPLETE).spin).toBe(false);
    expect(statusVisual(RunStatus.FAILED).label).toBe(RunStatus.FAILED);
    expect(statusVisual(undefined).tone).toBe("neutral");
  });
});
