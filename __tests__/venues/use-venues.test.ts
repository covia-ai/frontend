import '@testing-library/jest-dom';

// Rehydration must drop venue entries not keyed by DID: the SDK binds every
// auth JWT's audience to venueId, so a URL-keyed entry (pre-DID persisted
// format) makes the venue 401 all authenticated calls while anonymous reads
// keep working — surfacing as e.g. "unable to store secret".

describe('use-venues rehydration', () => {
  it('drops persisted venues whose venueId is not a DID', () => {
    window.localStorage.setItem(
      'venues',
      JSON.stringify({
        state: {
          venues: [
            { venueId: 'http://localhost:8080', baseUrl: 'http://localhost:8080', metadata: { name: 'Stale Local' } },
            { venueId: 'did:key:z6MkgpH3GNkq', baseUrl: 'http://localhost:8080', metadata: { name: 'Local' } },
            { venueId: 'did:web:venue-1.covia.ai', baseUrl: 'https://venue-1.covia.ai', metadata: { name: 'V1' } },
          ],
        },
        version: 0,
      }),
    );

    jest.isolateModules(() => {
      const { useVenues } = require('@/hooks/use-venues');
      const ids = useVenues.getState().venues.map((v: any) => v.venueId);
      expect(ids).toEqual(['did:key:z6MkgpH3GNkq', 'did:web:venue-1.covia.ai']);
    });
  });
});

// Zustand calls `merge(undefined, current)` when the key is absent. A merge that
// dereferences `persisted` throws inside persist's promise chain, which
// swallows it — leaving `hasHydrated()` false forever, so everything gated on
// useVenuesHydrated never runs for a first-time visitor.
describe('first visit (nothing persisted)', () => {
  beforeEach(() => window.localStorage.clear());

  it('finishes hydrating the venues store', () => {
    jest.isolateModules(() => {
      const { useVenues } = require('@/hooks/use-venues');
      expect(useVenues.persist.hasHydrated()).toBe(true);
      expect(useVenues.getState().venues).toEqual([]);
    });
  });

  it('finishes hydrating the auth store', () => {
    jest.isolateModules(() => {
      const { useAuthStore } = require('@/hooks/use-auth');
      expect(useAuthStore.persist.hasHydrated()).toBe(true);
      expect(useAuthStore.getState().authMap).toEqual({});
    });
  });
});

// Each tab persists its whole snapshot on every change. Without re-reading on
// the `storage` event, a tab opened earlier overwrites what another tab saved
// — for the auth store, the only copy of a newly generated device key.
describe('cross-tab sync', () => {
  beforeEach(() => window.localStorage.clear());

  const writeFromAnotherTab = (key: string, state: unknown) => {
    const newValue = JSON.stringify({ state, version: 0 });
    window.localStorage.setItem(key, newValue);
    window.dispatchEvent(
      new StorageEvent('storage', { key, newValue, storageArea: window.localStorage }),
    );
  };

  it('adopts a device key another tab saved instead of overwriting it', () => {
    jest.isolateModules(() => {
      const { useAuthStore } = require('@/hooks/use-auth');
      const KEY = 'a'.repeat(64);

      writeFromAnotherTab('venue-auth', {
        authMap: {}, accountsMap: {}, deviceKeyHex: KEY, deviceKeys: [KEY],
      });
      expect(useAuthStore.getState().deviceKeys).toEqual([KEY]);

      // This tab's next write must carry the other tab's key forward.
      useAuthStore.getState().loginWithToken('did:web:v', 'token', 'did:me');
      const persisted = JSON.parse(window.localStorage.getItem('venue-auth')!);
      expect(persisted.state.deviceKeys).toEqual([KEY]);
    });
  });

  it('adopts a venue another tab added', () => {
    jest.isolateModules(() => {
      const { useVenues } = require('@/hooks/use-venues');
      const added = { venueId: 'did:web:other-tab', baseUrl: 'https://other-tab', metadata: {} };

      writeFromAnotherTab('venues', { venues: [added], selectedVenueId: added.venueId });

      expect(useVenues.getState().venues.map((v: any) => v.venueId)).toEqual([added.venueId]);
    });
  });

  it('ignores storage events for unrelated keys', () => {
    jest.isolateModules(() => {
      const { useVenues } = require('@/hooks/use-venues');
      const rehydrate = jest.spyOn(useVenues.persist, 'rehydrate');

      writeFromAnotherTab('sidebar', { isOpen: false });

      expect(rehydrate).not.toHaveBeenCalled();
    });
  });
});

describe('reconcileVenues', () => {
  const { reconcileVenues } = require('@/hooks/use-venues');
  const v = (venueId: string, baseUrl: string, name?: string): any =>
    ({ venueId, baseUrl, metadata: { name } });

  it('drops a stored entry whose baseUrl resolved to a different DID (restarted venue)', () => {
    const oldLocal = v('did:key:z6MkOLD', 'http://127.0.0.1:8080', 'Old');
    const remote = v('did:web:venue-1.covia.ai', 'https://venue-1.covia.ai', 'V1');
    const newLocal = v('did:key:z6MkNEW', 'http://127.0.0.1:8080', 'New');

    const { venues, replaced } = reconcileVenues([oldLocal, remote], [newLocal]);

    expect(venues.map((x: any) => x.venueId).sort()).toEqual(['did:key:z6MkNEW', 'did:web:venue-1.covia.ai']);
    expect(replaced).toEqual([
      { oldId: 'did:key:z6MkOLD', newId: 'did:key:z6MkNEW', baseUrl: 'http://127.0.0.1:8080', name: 'New' },
    ]);
  });

  it('refreshes a same-DID entry in place with no replacement reported', () => {
    const stale = v('did:key:z6MkA', 'http://127.0.0.1:8080', 'Stale snapshot');
    const fresh = v('did:key:z6MkA', 'http://127.0.0.1:8080', 'Fresh');

    const { venues, replaced } = reconcileVenues([stale], [fresh]);

    expect(venues).toHaveLength(1);
    expect(venues[0].metadata.name).toBe('Fresh');
    expect(replaced).toEqual([]);
  });

  it('leaves unrelated venues untouched', () => {
    const a = v('did:key:z6MkA', 'https://a.example');
    const b = v('did:key:z6MkB', 'https://b.example');

    const { venues, replaced } = reconcileVenues([a], [b]);

    expect(venues.map((x: any) => x.venueId).sort()).toEqual(['did:key:z6MkA', 'did:key:z6MkB']);
    expect(replaced).toEqual([]);
  });
});
