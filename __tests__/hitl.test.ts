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
  };
});

import * as sdk from '@covia/covia-sdk';
import {
  HITL_RESPOND_ADDRESS,
  listHitlRequests,
  missingRequiredAnswers,
  respondToHitl,
  type HitlAsk,
} from '@/lib/hitl';

const runMock = (sdk as unknown as { __run: jest.Mock }).__run;

// A venue whose `h/` inbox resolves a fixed {id → record} map. `list` returns
// keys the way GET /api/v1/values/list does; `read` serves one record.
const venueWithInbox = (records: Record<string, unknown>, listImpl?: jest.Mock) => {
  const list = listImpl ??
    jest.fn().mockResolvedValue({ keys: Object.keys(records), count: Object.keys(records).length });
  const read = jest.fn((path: string) => {
    const id = path.startsWith('h/') ? path.slice(2) : path;
    return Promise.resolve(
      id in records ? { exists: true, value: records[id] } : { exists: false },
    );
  });
  const run = jest.fn();
  return { venue: { workspace: { list, read }, operations: { run } } as any, list, read, run };
};

const request = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: `req ${id}`, status: 'open', asks: [], ...over,
});

beforeEach(() => runMock.mockClear());

describe('listHitlRequests', () => {
  it('reads the h/ inbox job-free and returns newest first', async () => {
    const { venue, list, read, run } = venueWithInbox({
      old: request('old', { created: 1000 }),
      recent: request('recent', { created: 5000 }),
    });

    const out = await listHitlRequests(venue);

    expect(out.map((r) => r.id)).toEqual(['recent', 'old']);
    // Job-free: the key listing and each record went over workspace values
    // reads, never the hitl/list operation (which would persist a Job).
    expect(list).toHaveBeenCalledWith('h');
    expect(read).toHaveBeenCalledWith('h/old');
    expect(read).toHaveBeenCalledWith('h/recent');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns [] when the inbox has never been created', async () => {
    const rejecting = jest.fn().mockRejectedValue(new Error('Nil'));
    const { venue, read } = venueWithInbox({}, rejecting);

    await expect(listHitlRequests(venue)).resolves.toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });

  it('drops keys whose record cannot be read', async () => {
    const { venue } = venueWithInbox({ good: request('good') });
    // `missing` is listed but has no record behind it.
    venue.workspace.list = jest.fn().mockResolvedValue({ keys: ['good', 'missing'], count: 2 });

    const out = await listHitlRequests(venue);

    expect(out.map((r) => r.id)).toEqual(['good']);
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
