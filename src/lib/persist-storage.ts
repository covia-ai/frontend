// Storage backend for zustand's `persist`, and for any other direct
// `localStorage` read. Zustand only falls back to "no persistence" when
// *reading* the `localStorage` global throws, which is not enough in two real
// cases: Node >= 22 defines `localStorage` as an object with no methods unless
// started with a valid `--localstorage-file` path (so every persisted write
// during SSR threw "storage.setItem is not a function"), and browsers expose an
// unusable object under private browsing or storage policy. Probe for the API
// itself rather than for the global.
//
// Structurally compatible with zustand's `StateStorage`, but synchronous, so
// callers reading a key directly get a `string | null` rather than a union with
// a promise.

export type SyncStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const noopStorage: SyncStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const isUsable = (storage: Storage | undefined): storage is Storage =>
  typeof storage?.getItem === "function" &&
  typeof storage?.setItem === "function" &&
  typeof storage?.removeItem === "function";

export function browserStorage(): SyncStorage {
  // Reading the global at all emits a Node warning, so bail out before that.
  if (typeof window === "undefined") return noopStorage;
  try {
    return isUsable(window.localStorage) ? window.localStorage : noopStorage;
  } catch {
    // Reading the property throws outright when storage is blocked by policy.
    return noopStorage;
  }
}
