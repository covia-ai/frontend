import { formatCountdown, formatInterval, formatRelativeTime, getExecutionTime } from "@/lib/utils";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("getExecutionTime", () => {
  const start = "2026-10-26T10:00:00.000Z";
  const after = (ms: number) => new Date(Date.parse(start) + ms).toISOString();

  it("cascades hr → min → sec → ms", () => {
    expect(getExecutionTime(start, after(2 * HOUR + 5 * MIN))).toBe("2 hr 5 min");
    expect(getExecutionTime(start, after(3 * HOUR))).toBe("3 hr");
    expect(getExecutionTime(start, after(4 * MIN + 30 * SEC))).toBe("4 min 30 sec");
    expect(getExecutionTime(start, after(7 * MIN))).toBe("7 min");
    expect(getExecutionTime(start, after(12 * SEC))).toBe("12 sec");
    expect(getExecutionTime(start, after(250))).toBe("250 ms");
  });

  it("has no day unit", () => {
    expect(getExecutionTime(start, after(2 * DAY + HOUR))).toBe("49 hr");
  });
});

describe("formatCountdown", () => {
  beforeEach(() => jest.useFakeTimers({ now: Date.parse("2026-10-26T10:00:00.000Z") }));
  afterEach(() => jest.useRealTimers());

  it("counts down to a future time, in whole seconds at the bottom", () => {
    const now = Date.now();
    expect(formatCountdown(now + 2 * HOUR + 15 * MIN)).toBe("in 2 hr 15 min");
    expect(formatCountdown(now + 90 * SEC)).toBe("in 1 min 30 sec");
    expect(formatCountdown(now + 400)).toBe("in 0 sec");
    expect(formatCountdown(now - SEC)).toBe("due now");
  });
});

describe("formatInterval", () => {
  it("names a repeat cadence, with days above hours", () => {
    expect(formatInterval(DAY)).toBe("every 1 d");
    expect(formatInterval(2 * DAY + 3 * HOUR)).toBe("every 2 d 3 hr");
    expect(formatInterval(HOUR)).toBe("every 1 hr");
    expect(formatInterval(5 * MIN)).toBe("every 5 min");
    expect(formatInterval(30 * SEC)).toBe("every 30 sec");
    expect(formatInterval(0)).toBe("every 0 sec");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => jest.useFakeTimers({ now: Date.parse("2026-10-26T10:00:00.000Z") }));
  afterEach(() => jest.useRealTimers());

  it("is relative for the last week", () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    expect(formatRelativeTime(ago(2 * SEC))).toBe("just now");
    expect(formatRelativeTime(ago(30 * SEC))).toBe("30s ago");
    expect(formatRelativeTime(ago(10 * MIN))).toBe("10m ago");
    expect(formatRelativeTime(ago(3 * HOUR))).toBe("3h ago");
    expect(formatRelativeTime(ago(2 * DAY))).toBe("2d ago");
  });
});
