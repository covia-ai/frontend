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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useVenues } = require('@/hooks/use-venues');
      const ids = useVenues.getState().venues.map((v: any) => v.venueId);
      expect(ids).toEqual(['did:key:z6MkgpH3GNkq', 'did:web:venue-1.covia.ai']);
    });
  });
});

describe('reconcileVenues', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
