import "@testing-library/jest-dom";
import { act } from "@testing-library/react";
import { useNotificationLog } from "@/hooks/use-notification-log";

describe("useNotificationLog", () => {
  beforeEach(() => {
    act(() => {
      useNotificationLog.getState().clear();
    });
  });

  it("markRead flips only the targeted entry", () => {
    act(() => {
      useNotificationLog.getState().record("info", "First");
      useNotificationLog.getState().record("info", "Second");
    });
    const [second, first] = useNotificationLog.getState().entries; // newest first

    act(() => {
      useNotificationLog.getState().markRead(first.id);
    });

    const entries = useNotificationLog.getState().entries;
    expect(entries.find((e) => e.id === first.id)?.read).toBe(true);
    expect(entries.find((e) => e.id === second.id)?.read).toBe(false);
  });

  it("markAllRead flips every entry", () => {
    act(() => {
      useNotificationLog.getState().record("success", "One");
      useNotificationLog.getState().record("error", "Two");
      useNotificationLog.getState().markAllRead();
    });

    expect(useNotificationLog.getState().entries.every((e) => e.read)).toBe(true);
  });

  it("new entries default to unread", () => {
    act(() => {
      useNotificationLog.getState().record("warning", "Careful");
    });
    expect(useNotificationLog.getState().entries[0].read).toBe(false);
  });

  it("persists to localStorage under the notification-log key, not sessionStorage (#241)", () => {
    act(() => {
      useNotificationLog.getState().record("info", "Persisted?");
    });

    expect(window.sessionStorage.getItem("notification-log")).toBeNull();
    const raw = window.localStorage.getItem("notification-log");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.entries[0]).toMatchObject({ title: "Persisted?", read: false });
  });

  it("rehydrates entries (including read-state) persisted under the old or new shape", () => {
    window.localStorage.setItem(
      "notification-log",
      JSON.stringify({
        state: {
          entries: [
            { id: 1, kind: "success", title: "Old entry", at: 0, read: true, venueId: "v1", receiptHref: "/venues/v1/jobs/j1" },
          ],
        },
        version: 0,
      }),
    );

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useNotificationLog: rehydrated } = require("@/hooks/use-notification-log");
      expect(rehydrated.getState().entries).toEqual([
        { id: 1, kind: "success", title: "Old entry", at: 0, read: true, venueId: "v1", receiptHref: "/venues/v1/jobs/j1" },
      ]);
    });
  });
});
