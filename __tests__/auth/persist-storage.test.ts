// Zustand's `createJSONStorage(() => localStorage)` only falls back to "no
// persistence" when reading the global *throws*. Node >= 22 defines a
// `localStorage` global that is a plain object with no methods unless the
// process was started with a valid `--localstorage-file` path, so the read
// succeeds and zustand hands back a wrapper over a non-functional stub. The
// first persisted write then throws "storage.setItem is not a function" —
// during SSR this surfaced as an unhandled rejection on every render.
//
// The same shape occurs in a browser whose storage is unavailable (Safari
// private browsing, storage disabled by policy), so the guard probes for the
// API rather than for `window`.

const methodlessStorage = {} as Storage;

const workingStorage = (): Storage => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  } as unknown as Storage;
};

const withLocalStorage = (value: Storage | undefined, run: () => void) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    value,
    configurable: true,
    writable: true,
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
};

describe('browserStorage', () => {
  it('falls back to a no-op when localStorage exists but has no methods', () => {
    withLocalStorage(methodlessStorage, () => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { browserStorage } = require('@/lib/persist-storage');
        const storage = browserStorage();

        expect(() => storage.setItem('venues', '{}')).not.toThrow();
        expect(() => storage.removeItem('venues')).not.toThrow();
        expect(storage.getItem('venues')).toBeNull();
      });
    });
  });

  it('falls back to a no-op when there is no localStorage global at all', () => {
    withLocalStorage(undefined, () => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { browserStorage } = require('@/lib/persist-storage');
        expect(() => browserStorage().setItem('venues', '{}')).not.toThrow();
      });
    });
  });

  it('uses the real localStorage when it is usable, so persistence still works', () => {
    const real = workingStorage();
    withLocalStorage(real, () => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { browserStorage } = require('@/lib/persist-storage');
        browserStorage().setItem('venues', '{"state":{}}');
        expect(real.getItem('venues')).toBe('{"state":{}}');
      });
    });
  });
});

describe('persisted stores where localStorage is unusable', () => {
  it('does not throw when a store is written', () => {
    withLocalStorage(methodlessStorage, () => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useSidebar } = require('@/hooks/use-sidebar');
        expect(() => useSidebar.getState().setIsOpen(false)).not.toThrow();
        expect(useSidebar.getState().isOpen).toBe(false);
      });
    });
  });
});
