// Complete double for `@/lib/notify`. Mirrors every export of the real module
// so a component that reaches for a notifier no hand-written mock happened to
// declare still finds a function rather than `undefined`.
//
//   import { notifyMock } from "@test/notify";
//   jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

/** Real `jobFailure` returns this pair; callers destructure it immediately. */
export const defaultJobFailure = (err: unknown) => ({
  reason: err,
  jobHref: undefined as string | undefined,
});

export const notifyMock = {
  notifySuccess: jest.fn<void, [string, unknown?]>(),
  notifyInfo: jest.fn<void, [string, unknown?]>(),
  notifyWarning: jest.fn<void, [string, unknown?]>(),
  notifyError: jest.fn<void, [string, unknown?, string?, string?]>(),
  // Passes the error straight through, matching the real helper's behaviour for
  // anything that is not a JobFailedError — the common case under test.
  jobFailure: jest.fn(defaultJobFailure),
};

/** Restores the default implementations `clearAllMocks` would strip. */
export function resetNotifyMock(): void {
  notifyMock.notifySuccess.mockReset();
  notifyMock.notifyInfo.mockReset();
  notifyMock.notifyWarning.mockReset();
  notifyMock.notifyError.mockReset();
  notifyMock.jobFailure.mockReset();
  notifyMock.jobFailure.mockImplementation(defaultJobFailure);
}
