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

type PersistedStore = {
  persist: {
    getOptions: () => { name?: string };
    rehydrate: () => Promise<void> | void;
  };
};

// `persist` writes a store's whole snapshot on every change and never reads
// storage again, so a tab opened earlier silently overwrites what another tab
// saved — for the auth store, the only copy of a newly generated device key.
// Re-reading on the `storage` event keeps every tab's snapshot current. The
// event fires only in the *other* tabs, so this cannot loop.
export function syncStoreAcrossTabs(store: PersistedStore): void {
  if (typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    // A cleared key carries no state to adopt; keep what this tab has.
    if (event.newValue === null) return;
    if (event.key === store.persist.getOptions().name) void store.persist.rehydrate();
  });
}

// Same probing, for per-tab state that should survive reloads but not tabs.
export function browserSessionStorage(): SyncStorage {
  if (typeof window === "undefined") return noopStorage;
  try {
    return isUsable(window.sessionStorage) ? window.sessionStorage : noopStorage;
  } catch {
    return noopStorage;
  }
}
