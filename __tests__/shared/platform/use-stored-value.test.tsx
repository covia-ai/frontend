import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useCallback, useState } from "react";
import { useStoredValue } from "@/hooks/use-stored-value";

const KEY = "stored-value-test";
const readJson = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as { n: number } | null;

describe("useStoredValue", () => {
  beforeEach(() => localStorage.clear());

  it("reads the browser value on the client and keeps its identity while unchanged", () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 1 }));
    const { result, rerender } = renderHook(() => useStoredValue(readJson));

    const [first] = result.current;
    expect(first).toEqual({ n: 1 });
    rerender();
    // A fresh parse each render, but the same object comes back — so it can be
    // a dependency without retriggering anything.
    expect(result.current[0]).toBe(first);
  });

  it("is undefined on the server, so hydration starts from the same nothing", () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 1 }));
    function Probe() {
      const [value] = useStoredValue(readJson);
      return <span data-testid="probe">{value === undefined ? "unknown" : "known"}</span>;
    }

    expect(renderToString(<Probe />)).toContain("unknown");
  });

  it("re-reads on storage and on the events it is told about", () => {
    const { result } = renderHook(() => useStoredValue(readJson, { events: ["my-change"] }));
    expect(result.current[0]).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ n: 2 }));
    act(() => { window.dispatchEvent(new Event("my-change")); });
    expect(result.current[0]).toEqual({ n: 2 });

    localStorage.setItem(KEY, JSON.stringify({ n: 3 }));
    act(() => { window.dispatchEvent(new Event("storage")); });
    expect(result.current[0]).toEqual({ n: 3 });
  });

  it("re-reads on refresh(), for a write the caller has just made itself", () => {
    const { result } = renderHook(() => useStoredValue(readJson));
    expect(result.current[0]).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ n: 4 }));
    act(() => result.current[1]());
    expect(result.current[0]).toEqual({ n: 4 });
  });

  it("re-reads when given a different reader", () => {
    localStorage.setItem("a", "1");
    localStorage.setItem("b", "2");
    const { result } = renderHook(() => {
      const [key, setKey] = useState("a");
      const read = useCallback(() => localStorage.getItem(key), [key]);
      const [value] = useStoredValue(read);
      return { value, setKey };
    });
    expect(result.current.value).toBe("1");

    act(() => result.current.setKey("b"));
    expect(result.current.value).toBe("2");
  });
});
