import copy from "copy-to-clipboard";

/**
 * The one way to write to the clipboard. `navigator.clipboard` only exists in
 * a secure context, so calling it directly throws on a venue UI served over
 * plain HTTP — and an un-awaited call reports success it never had. Rejects
 * when the browser refuses, so callers confirm a copy only after it happened.
 */
export async function writeTextToClipboard(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to copy-to-clipboard for browsers that expose the API
      // but reject it outside a secure context or without permission.
    }
  }
  // copy() is async (v4): un-awaited, its Promise is always truthy and a
  // refused write would pass for a successful one.
  if (!(await copy(value))) throw new Error("The browser did not accept the clipboard write");
}
