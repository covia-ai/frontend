const mockResolve = jest.fn();
jest.mock('@/lib/operations-catalog', () => ({
  resolveOperationByAddress: (...args: unknown[]) => mockResolve(...args),
}));

import { runEscalation } from '@/components/governed-escalation/beats';
import { DEFAULT_ADDRESSES } from '@/components/governed-escalation/fixtures';

beforeEach(() => jest.clearAllMocks());

describe('runEscalation — analysis wait (frontend#338)', () => {
  it('quotes the real finding once the analysis job actually completes, not a placeholder', async () => {
    // Still PENDING when invoke() resolves, and only reaches COMPLETE after
    // wait() has polled a couple of times — the exact race that produced the
    // false "did not complete" quote.
    const analysis = {
      id: 'analysis-1',
      metadata: { status: 'PENDING' },
      output: undefined,
      isFinished: false,
      isComplete: false,
      wait: jest.fn(async function (this: typeof analysis) {
        this.metadata = { status: 'COMPLETE' };
        this.output = { summary: 'deviceReuseRate 0.41 vs baseline 0.12, ratio 3.4x' };
        this.isFinished = true;
        this.isComplete = true;
      }),
    };
    const agentInvoke = jest.fn(async () => analysis);
    const askInvoke = jest.fn(async (input: unknown) => ({ id: 'ask-1', input }));
    mockResolve.mockImplementation(async (_venue: unknown, op: string) =>
      op === 'v/ops/agent/request' ? { invoke: agentInvoke } : { invoke: askInvoke },
    );
    const venue = { agents: { info: jest.fn(async () => ({ status: 'RUNNING' })) }, workspace: {} } as never;

    const { ask } = await runEscalation(venue, DEFAULT_ADDRESSES);

    expect(analysis.wait).toHaveBeenCalledWith({ timeout: 60_000 });
    const askInput = (askInvoke.mock.calls[0][0] as { description: string }).description;
    expect(askInput).toContain('deviceReuseRate 0.41 vs baseline 0.12, ratio 3.4x');
    expect(askInput).not.toContain('did not complete');
    expect(ask.id).toBe('ask-1');
  });

  it('falls back to the honest placeholder when the analysis genuinely times out', async () => {
    const analysis = {
      id: 'analysis-2',
      metadata: { status: 'STARTED' },
      output: undefined,
      isFinished: false,
      isComplete: false,
      wait: jest.fn(async () => { throw new Error('timed out'); }),
    };
    const agentInvoke = jest.fn(async () => analysis);
    const askInvoke = jest.fn(async (input: unknown) => ({ id: 'ask-2', input }));
    mockResolve.mockImplementation(async (_venue: unknown, op: string) =>
      op === 'v/ops/agent/request' ? { invoke: agentInvoke } : { invoke: askInvoke },
    );
    const venue = { agents: { info: jest.fn(async () => ({ status: 'RUNNING' })) }, workspace: {} } as never;

    await runEscalation(venue, DEFAULT_ADDRESSES);

    const askInput = (askInvoke.mock.calls[0][0] as { description: string }).description;
    expect(askInput).toContain("did not complete");
  });
});
