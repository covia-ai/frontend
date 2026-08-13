import '@testing-library/jest-dom';

// Reads must not create jobs. The catalog helpers read the venue via
// `venue.workspace.read` (job-free GET /api/v1/values/read in the SDK, with the
// SDK owning any pre-0.3 invoke fallback), and listMcpTools fetches the native
// /mcp JSON-RPC endpoint. Neither may reach `venue.operations.run`.

// Stub the SDK's Operation so resolveOperationByAddress can construct one
// without pulling in SDK internals (Venue/CatalogOp are type-only, erased).
jest.mock('@covia/covia-sdk', () => ({
  Operation: class {
    constructor(
      public id: string,
      public venue: unknown,
      public metadata: unknown,
    ) {}
  },
}));

import {
  listCatalogOperations,
  resolveOperationByAddress,
} from '@/lib/operations-catalog';
import { listMcpTools } from '@/lib/utils';

const BASE = 'http://venue.example.com';

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

const mockFetch = (impl: jest.Mock) => {
  global.fetch = impl as unknown as typeof fetch;
  return impl;
};

// A venue whose workspace.read resolves a fixed {path → value} catalog map.
const venueWithTree = (tree: Record<string, unknown>) => {
  const read = jest.fn((path: string) =>
    Promise.resolve(
      path in tree ? { exists: true, value: tree[path] } : { exists: false },
    ),
  );
  const run = jest.fn();
  const getAsset = jest.fn();
  return { venue: { workspace: { read }, operations: { run }, getAsset } as any, read, run, getAsset };
};

describe('listCatalogOperations', () => {
  it('reads v/ops and v/test/ops job-free and flattens to catalog paths', async () => {
    const { venue, read, run } = venueWithTree({
      'v/ops': { agent: { suspend: { operation: {} }, resume: { operation: {} } } },
      'v/test/ops': { echo: { operation: {} } },
    });

    const ops = await listCatalogOperations(venue);

    expect(ops.map((o) => o.path).sort()).toEqual([
      'v/ops/agent/resume',
      'v/ops/agent/suspend',
      'v/test/ops/echo',
    ]);
    // Job-free: went through workspace.read, never the invoke/job path.
    expect(read).toHaveBeenCalledWith('v/ops');
    expect(read).toHaveBeenCalledWith('v/test/ops');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns [] for a missing/empty catalog sub-tree', async () => {
    const { venue } = venueWithTree({});
    await expect(listCatalogOperations(venue)).resolves.toEqual([]);
  });

  it('includes operations at any depth, including directly under the root', async () => {
    // Venues mix depths: most ops are v/ops/<adapter>/<op>, but some (skills,
    // memory) sit directly under v/ops. A fixed-depth walk dropped the latter.
    const { venue } = venueWithTree({
      'v/ops': {
        agent: { suspend: { operation: {} } },
        skills: { name: 'Skills', operation: { adapter: 'skills' } },
      },
    });

    const ops = await listCatalogOperations(venue);

    expect(ops.map((o) => o.path).sort()).toEqual(['v/ops/agent/suspend', 'v/ops/skills']);
  });

  it('excludes namespace nodes and never descends into an operation', async () => {
    const { venue } = venueWithTree({
      'v/ops': {
        // `agent` is a pure namespace; the op's own input schema carries a
        // nested `operation` key that must not be mistaken for an entry.
        agent: { suspend: { operation: { input: { nested: { operation: 'decoy' } } } } },
        // A namespace holding nothing operation-shaped at all.
        empty: { notAnOp: { just: 'data' } },
      },
    });

    const ops = await listCatalogOperations(venue);

    expect(ops.map((o) => o.path)).toEqual(['v/ops/agent/suspend']);
  });

  it('reads the user catalog at w/ops only when includeUserOps is set', async () => {
    const tree = {
      'v/ops': { agent: { suspend: { operation: {} } } },
      'w/ops': { 'infer-validate': { operation: { adapter: 'orchestrator' } } },
    };

    const signedOut = venueWithTree(tree);
    await expect(listCatalogOperations(signedOut.venue)).resolves.toEqual([
      { path: 'v/ops/agent/suspend', metadata: { operation: {} } },
    ]);
    expect(signedOut.read).not.toHaveBeenCalledWith('w/ops');

    const signedIn = venueWithTree(tree);
    const ops = await listCatalogOperations(signedIn.venue, { includeUserOps: true });
    expect(ops.map((o) => o.path).sort()).toEqual([
      'v/ops/agent/suspend',
      'w/ops/infer-validate',
    ]);
    expect(signedIn.read).toHaveBeenCalledWith('w/ops');
  });
});

describe('resolveOperationByAddress', () => {
  it('reuses metadata already loaded by the catalog', async () => {
    const metadata = { name: 'Agent Info', operation: { id: 'info' } };
    const { venue, read, run } = venueWithTree({
      'v/ops': { agent: { info: metadata } },
    });

    await listCatalogOperations(venue);
    read.mockClear();

    const op = await resolveOperationByAddress(venue, 'v/ops/agent/info');

    expect(op.metadata).toBe(metadata);
    expect(read).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('resolves a catalog path job-free and carries the address as the op id', async () => {
    const { venue, read, run } = venueWithTree({
      'v/ops/agent/suspend': { operation: { id: 'suspend' } },
    });

    const op = await resolveOperationByAddress(venue, 'v/ops/agent/suspend');

    expect(op.id).toBe('v/ops/agent/suspend');
    expect(op.metadata).toEqual({ operation: { id: 'suspend' } });
    expect(read).toHaveBeenCalledWith('v/ops/agent/suspend');
    expect(run).not.toHaveBeenCalled();
  });

  it('resolves an a/<hash> address via getAsset, not a read', async () => {
    const { venue, read, getAsset } = venueWithTree({});
    const asset = { id: 'the-asset' };
    getAsset.mockResolvedValue(asset);

    await expect(resolveOperationByAddress(venue, 'a/abc123')).resolves.toBe(asset);
    expect(getAsset).toHaveBeenCalledWith('abc123');
    expect(read).not.toHaveBeenCalled();
  });

  it('throws when the address resolves to a non-operation value', async () => {
    const { venue } = venueWithTree({ 'o/not-an-op': { just: 'data' } });
    await expect(resolveOperationByAddress(venue, 'o/not-an-op')).rejects.toThrow(
      'No operation found at o/not-an-op',
    );
  });
});

describe('listMcpTools', () => {
  it('POSTs JSON-RPC tools/list to the native /mcp endpoint', async () => {
    const tools = [{ name: 'covia_read' }, { name: 'covia_write' }];
    const fetchMock = mockFetch(jest.fn()
      .mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: { tools } })));

    await expect(listMcpTools(BASE)).resolves.toEqual(tools);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/mcp`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toMatchObject({ jsonrpc: '2.0', method: 'tools/list' });
  });

  it('returns [] when the response has no tools array', async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: {} })));
    await expect(listMcpTools(BASE)).resolves.toEqual([]);
  });

  it('throws on a non-OK response so callers surface the error state', async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({}, false, 500)));
    await expect(listMcpTools(BASE)).rejects.toThrow('MCP tools/list failed: 500');
  });
});
