import copy from "copy-to-clipboard";
import { writeTextToClipboard } from "@/lib/clipboard";

jest.mock("copy-to-clipboard", () => ({ __esModule: true, default: jest.fn() }));

const fallback = copy as unknown as jest.Mock;
const setNavigatorClipboard = (clipboard: unknown) =>
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });

describe("writeTextToClipboard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses the async Clipboard API when the browser offers it", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setNavigatorClipboard({ writeText });

    await writeTextToClipboard("value");

    expect(writeText).toHaveBeenCalledWith("value");
    expect(fallback).not.toHaveBeenCalled();
  });

  // A venue UI served over plain HTTP: navigator.clipboard does not exist.
  it("falls back when there is no Clipboard API", async () => {
    setNavigatorClipboard(undefined);
    fallback.mockResolvedValue(true);

    await expect(writeTextToClipboard("value")).resolves.toBeUndefined();
    expect(fallback).toHaveBeenCalledWith("value");
  });

  it("falls back when the Clipboard API refuses the write", async () => {
    setNavigatorClipboard({ writeText: jest.fn().mockRejectedValue(new Error("denied")) });
    fallback.mockResolvedValue(true);

    await expect(writeTextToClipboard("value")).resolves.toBeUndefined();
  });

  // The fallback is async: tested as a bare value its Promise is always
  // truthy, which reported every refused copy as a success.
  it("rejects when the fallback is refused too, so no caller confirms a copy that never happened", async () => {
    setNavigatorClipboard(undefined);
    fallback.mockResolvedValue(false);

    await expect(writeTextToClipboard("value")).rejects.toThrow();
  });
});
