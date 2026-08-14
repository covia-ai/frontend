import '@testing-library/jest-dom';

// Stub the SDK's Operation so respondToHitl can construct one through
// resolveOperationByAddress without pulling in SDK internals. The shared `run`
// is re-exported so the test can assert exactly what was sent.
jest.mock('@covia/covia-sdk', () => {
  const run = jest.fn().mockResolvedValue({ status: 'answered', id: 'req-1' });
  return {
    __run: run,
    Operation: class {
      run = run;
      constructor(
        public id: string,
        public venue: unknown,
        public metadata: unknown,
      ) {}
    },
    UnsupportedVenueFeatureError: class UnsupportedVenueFeatureError extends Error {
      constructor(public readonly feature: string) {
        super(`The connected venue cannot serve ${feature} without creating a job.`);
        this.name = 'UnsupportedVenueFeatureError';
      }
    },
  };
});

import * as sdk from '@covia/covia-sdk';
import { UnsupportedVenueFeatureError } from '@covia/covia-sdk';
import {
  HITL_RESPOND_ADDRESS,
  countOpenHitlRequests,
  listHitlRequests,
  missingRequiredAnswers,
  respondToHitl,
  type HitlAsk,
} from '@/lib/hitl';

const runMock = (sdk as unknown as { __run: jest.Mock }).__run;

// A venue whose `h/` inbox resolves a fixed {id → record} map in ONE values
// read; `slice` pages {key, value} pairs for the over-cap fallback and
// `aggregate` serves the status group counts.
const venueWithInbox = (records: Record<string, unknown>, readImpl?: jest.Mock) => {
  const read = readImpl ??
    jest.fn((path: string) =>
      Promise.resolve(
        path === 'h'
          ? { exists: true, type: 'Index', value: records }
          : { exists: false },
      ));
  const list = jest.fn().mockResolvedValue({ keys: Object.keys(records), count: Object.keys(records).length });
  const slice = jest.fn((_path: string, offset: number, limit: number) => {
    const entries = Object.entries(records).slice(offset, offset + limit);
    return Promise.resolve({
      exists: true,
      count: Object.keys(records).length,
      offset,
      values: entries.map(([key, value]) => ({ key, value })),
    });
  });
  const aggregate = jest.fn();
  const run = jest.fn();
  return {
    venue: { workspace: { list, read, slice, aggregate }, operations: { run } } as any,
    list, read, slice, aggregate, run,
  };
};

const request = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: `req ${id}`, status: 'open', asks: [], ...over,
});

beforeEach(() => runMock.mockClear());

describe('listHitlRequests', () => {
  it('reads the whole h/ inbox in one job-free values read, newest first', async () => {
    const { venue, read, run } = venueWithInbox({
      old: request('old', { created: 1000 }),
      recent: request('recent', { created: 5000 }),
    });

    const out = await listHitlRequests(venue);

    expect(out.map((r) => r.id)).toEqual(['recent', 'old']);
    // ONE read for the entire inbox — no per-record fan-out, and never the
    // hitl/list operation (which would persist a Job).
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('h');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns [] when the inbox has never been created', async () => {
    // An inbox with no requests yet resolves to Nil rather than throwing.
    const nil = jest.fn().mockResolvedValue({ type: 'Nil', exists: false });
    const { venue, slice } = venueWithInbox({}, nil);

    await expect(listHitlRequests(venue)).resolves.toEqual([]);
    expect(slice).not.toHaveBeenCalled();
  });

  it('propagates a failed read instead of reporting an empty inbox', async () => {
    // A 403 (wrong venue for this identity) or a dead host must not render as
    // "nothing waiting on you" — that is indistinguishable from a healthy
    // empty inbox and leaves nothing to diagnose.
    const forbidden = jest.fn().mockRejectedValue(new Error('HTTP 403: Request failed'));
    const { venue } = venueWithInbox({}, forbidden);

    await expect(listHitlRequests(venue)).rejects.toThrow('HTTP 403');
  });

  it('drops entries that are not valid request records', async () => {
    const { venue } = venueWithInbox({
      good: request('good'),
      broken: null,
      stray: 'not-a-record',
    });

    const out = await listHitlRequests(venue);

    expect(out.map((r) => r.id)).toEqual(['good']);
  });

  it('pages an over-cap inbox through slice instead of failing', async () => {
    const records = {
      a: request('a', { created: 3 }),
      b: request('b', { created: 2 }),
      c: request('c', { created: 1 }),
    };
    const truncated = jest.fn((path: string) =>
      Promise.resolve(
        path === 'h'
          ? { exists: true, truncated: true, type: 'Index', valueBytes: 2_000_000 }
          : { exists: false },
      ));
    const { venue, slice } = venueWithInbox(records, truncated);

    const out = await listHitlRequests(venue);

    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(slice).toHaveBeenCalled();
  });
});

describe('countOpenHitlRequests', () => {
  it('asks the venue to group by status — one call, no record download', async () => {
    const { venue, aggregate, read } = venueWithInbox({});
    aggregate.mockResolvedValue({
      exists: true,
      count: 7,
      groups: { open: { count: 2 }, answered: { count: 4 }, rejected: { count: 1 } },
    });

    await expect(countOpenHitlRequests(venue)).resolves.toBe(2);
    expect(aggregate).toHaveBeenCalledWith('h', { groupBy: 'status' });
    expect(read).not.toHaveBeenCalled();
  });

  it('treats a missing inbox or absent open group as zero', async () => {
    const { venue, aggregate } = venueWithInbox({});
    aggregate.mockResolvedValueOnce({ exists: false });
    await expect(countOpenHitlRequests(venue)).resolves.toBe(0);
    aggregate.mockResolvedValueOnce({ exists: true, count: 3, groups: { answered: { count: 3 } } });
    await expect(countOpenHitlRequests(venue)).resolves.toBe(0);
  });

  it('falls back to the full listing on venues without aggregate', async () => {
    const { venue, aggregate } = venueWithInbox({
      a: request('a', { status: 'open' }),
      b: request('b', { status: 'answered' }),
    });
    aggregate.mockRejectedValue(new UnsupportedVenueFeatureError('workspace aggregate reads'));

    await expect(countOpenHitlRequests(venue)).resolves.toBe(1);
  });
});

describe('missingRequiredAnswers', () => {
  const asks: HitlAsk[] = [
    { id: 'approve', type: 'approval', prompt: 'ok?', required: true },
    { id: 'window', type: 'choice', prompt: 'when?', required: true },
    { id: 'checks', type: 'checkboxes', prompt: 'done?', required: true },
    { id: 'notes', type: 'text', prompt: 'notes?', required: false },
  ];

  it('treats a declined approval as answered, not missing', () => {
    // `false` is a real answer to an approval ask — it means "no".
    expect(missingRequiredAnswers(asks, {
      approve: false, window: 'now', checks: ['tests'],
    })).toEqual([]);
  });

  it('flags absent, blank and empty answers', () => {
    expect(missingRequiredAnswers(asks, {
      window: '   ', checks: [],
    })).toEqual(['approve', 'window', 'checks']);
  });

  it('never flags optional asks', () => {
    expect(missingRequiredAnswers(
      [{ id: 'notes', type: 'text', prompt: 'notes?', required: false }],
      {},
    )).toEqual([]);
  });
});

describe('respondToHitl', () => {
  it('resolves the respond op and sends the response verbatim', async () => {
    const { venue } = venueWithInbox({});
    venue.workspace.read = jest.fn().mockResolvedValue({
      exists: true, value: { operation: { adapter: 'hitl:respond' } },
    });

    await respondToHitl(venue, {
      id: 'req-1', outcome: 'answer', answers: { approve: true }, comment: 'go',
    });

    expect(venue.workspace.read).toHaveBeenCalledWith(HITL_RESPOND_ADDRESS);
    expect(runMock).toHaveBeenCalledWith({
      id: 'req-1', outcome: 'answer', answers: { approve: true }, comment: 'go',
    });
  });

  it('never echoes capability grants', async () => {
    const { venue } = venueWithInbox({});
    venue.workspace.read = jest.fn().mockResolvedValue({
      exists: true, value: { operation: { adapter: 'hitl:respond' } },
    });

    await respondToHitl(venue, { id: 'req-1', outcome: 'reject', comment: 'no' });

    // Echoing a grant makes the venue issue a real UCAN capability, so the
    // field must never be sent implicitly.
    expect(runMock.mock.calls[0][0]).not.toHaveProperty('grants');
  });
});

describe('respondToHitl error surfacing', () => {
  it("surfaces the venue's reason, not just the job id", async () => {
    const reason =
      'echoed grant 0 was not offered by the choices made — the venue issues only offered-and-triggered grants';
    const { venue } = venueWithInbox({});
    venue.workspace.read = jest.fn().mockResolvedValue({
      exists: true, value: { operation: { adapter: 'hitl:respond' } },
    });
    runMock.mockRejectedValueOnce(
      Object.assign(new Error('Job 0xabc FAILED'), { jobData: { error: reason } }),
    );
    await expect(
      respondToHitl(venue, { id: 'r1', outcome: 'answer' }),
    ).rejects.toThrow(reason);
  });

  it('rethrows untouched when the venue gave no reason', async () => {
    const { venue } = venueWithInbox({});
    venue.workspace.read = jest.fn().mockResolvedValue({
      exists: true, value: { operation: { adapter: 'hitl:respond' } },
    });
    runMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(
      respondToHitl(venue, { id: 'r1', outcome: 'answer' }),
    ).rejects.toThrow('Failed to fetch');
  });
});
