import { resetNotifyMock } from "@test/notify";
import { resetAuthMock } from "@test/use-auth";
import { resetVenueMock } from "@test/use-authenticated-venue";

/**
 * Clears call history *and* restores default return values on every shared
 * double. Prefer this to a bare `jest.clearAllMocks()` in `beforeEach`:
 * clearAllMocks strips the implementations the defaults depend on, so the
 * next test would see `undefined` where it expected an empty list.
 *
 * Safe to call even for suites that only mock one of the three modules — each
 * reset touches only its own doubles.
 */
export function resetSupportMocks(): void {
  resetNotifyMock();
  resetAuthMock();
  resetVenueMock();
}
