import '@testing-library/jest-dom';
import { readValue } from '@/lib/operations-catalog';
import { listMcpTools } from '@/lib/utils';

// Reads must not create jobs: readValue and listMcpTools fetch via job-free
// endpoints (GET /api/v1/values/read, native /mcp JSON-RPC) and only readValue
// may fall back to the invoke-based covia:read when the venue lacks the route.

const BASE = 'http://venue.example.com';

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

const mockFetch = (impl: jest.Mock) => {
  global.fetch = impl as unknown as typeof fetch;
  return impl;
};

describe('readValue', () => {
  it('reads via GET /api/v1/values/read and returns the value', async () => {
    const fetchMock = mockFetch(jest.fn()
      .mockResolvedValue(jsonResponse({ value: { operation: {} }, exists: true, valueBytes: 12 })));
    const run = jest.fn();
    const venue = { baseUrl: BASE, operations: { run } } as any;

    const value = await readValue(venue, 'v/ops/covia/read');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/values/read?path=${encodeURIComponent('v/ops/covia/read')}`);
    expect(value).toEqual({ operation: {} });
    expect(run).not.toHaveBeenCalled();
  });

  it('falls back to invoke-based covia:read when the route is missing (pre-0.3 venue)', async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ error: 'not found' }, false, 404)));
    const run = jest.fn().mockResolvedValue({ value: 'fallback' });
    const venue = { baseUrl: BASE, operations: { run } } as any;

    await expect(readValue(venue, 'v/ops')).resolves.toBe('fallback');
    expect(run).toHaveBeenCalledWith('v/ops/covia/read', { path: 'v/ops' });
  });

  it('falls back to invoke on network failure', async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error('offline')));
    const run = jest.fn().mockResolvedValue({ value: 42 });
    const venue = { baseUrl: BASE, operations: { run } } as any;

    await expect(readValue(venue, 'w/x')).resolves.toBe(42);
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
