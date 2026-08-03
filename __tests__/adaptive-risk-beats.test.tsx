import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockResolve = jest.fn();
jest.mock('@/lib/operations-catalog', () => ({
  resolveOperationByAddress: (...args: unknown[]) => mockResolve(...args),
}));

import {
  runBeat1,
  runAssessorBeat,
  readLedger,
  readDecisions,
  findOpenAsk,
  extractGrantToken,
  reconstructionCurl,
  summariseRecord,
  JOBS_MD_RULE,
  AGENT_REQUEST_OP,
} from '@/components/adaptive-risk/beats';
import { BeatCard } from '@/components/adaptive-risk/BeatCard';
import { RefusalPanel, extractDenial } from '@/components/adaptive-risk/RefusalPanel';
import { DEFAULT_ADDRESSES } from '@/components/adaptive-risk/fixtures';
import { ADAPTIVE_RISK_BEATS } from '@/components/adaptive-risk/story';

const beat1 = ADAPTIVE_RISK_BEATS[0];

// The stub jobs below are structural stand-ins for Job; this keeps the cast
// in one place rather than at every call site.
type RunProp = React.ComponentProps<typeof BeatCard>['run'];
const asRun = (fn: () => Promise<unknown>): RunProp => fn as unknown as RunProp;

function finishedJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-77',
    isFinished: true,
    isComplete: true,
    metadata: { status: 'COMPLETE' },
    output: { summary: 'flagged dev-9903' },
    refresh: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('runBeat1', () => {
  it('dispatches the sentinel task through agent:request', async () => {
    const invoke = jest.fn(async (_input: unknown) => finishedJob());
    mockResolve.mockResolvedValue({ invoke });
    const venue = { venueId: 'v', baseUrl: 'http://venue.test' } as never;

    await runBeat1(venue, DEFAULT_ADDRESSES);

    expect(mockResolve).toHaveBeenCalledWith(venue, AGENT_REQUEST_OP);
    const input = invoke.mock.calls[0][0] as {
      agentId: string;
      input: { task: string };
    };
    expect(input.agentId).toBe(DEFAULT_ADDRESSES.sentinelAgent);
    expect(input.input.task).toContain('w/risk/applications');
    expect(input.input.task).toContain('sharedWith');
    expect(input.input.task).not.toMatch(/replay/i);
  });
});

describe('runAssessorBeat', () => {
  it('asks the assessor to issue exactly the given amount via the gated op', async () => {
    const invoke = jest.fn(async (_input: unknown) => finishedJob());
    mockResolve.mockResolvedValue({ invoke });
    const info = jest.fn(async () => ({ status: 'SLEEPING' }));
    const resume = jest.fn();
    const venue = { agents: { info, resume } } as never;

    await runAssessorBeat(venue, DEFAULT_ADDRESSES, 'APP-1071', 2500, 'dev-9903');

    const input = invoke.mock.calls[0][0] as { agentId: string; input: { task: string } };
    expect(input.agentId).toBe(DEFAULT_ADDRESSES.assessorAgent);
    expect(input.input.task).toContain(DEFAULT_ADDRESSES.issueLimit);
    expect(input.input.task).toContain('"amount": 2500');
    expect(input.input.task).toContain('word for word');
    // A healthy agent is not resumed.
    expect(resume).not.toHaveBeenCalled();
  });

  it('clears a deliberate suspension before dispatching, and never swallows a failed resume', async () => {
    const invoke = jest.fn(async (_input: unknown) => finishedJob());
    mockResolve.mockResolvedValue({ invoke });
    const info = jest.fn(async () => ({ status: 'SUSPENDED' }));

    const resume = jest.fn();
    await runAssessorBeat(
      { agents: { info, resume } } as never,
      DEFAULT_ADDRESSES, 'APP-1060', 500, 'dev-4411',
    );
    expect(resume).toHaveBeenCalledWith(DEFAULT_ADDRESSES.assessorAgent);

    const failing = jest.fn(async () => { throw new Error('resume refused by venue'); });
    await expect(
      runAssessorBeat(
        { agents: { info, resume: failing } } as never,
        DEFAULT_ADDRESSES, 'APP-1060', 500, 'dev-4411',
      ),
    ).rejects.toThrow('resume refused by venue');
  });
});

describe('readDecisions', () => {
  it('reads the decision ledger job-free', async () => {
    const read = jest.fn(async () => ({ exists: true, value: { applicant: 'APP-1060', status: 'approved' } }));
    const list = jest.fn(async () => ({ exists: true, keys: ['APP-1060'] }));
    const run = jest.fn();
    const snapshot = await readDecisions({ workspace: { read, list }, operations: { run } } as never, DEFAULT_ADDRESSES);
    expect(snapshot.applicants).toEqual(['APP-1060']);
    expect(run).not.toHaveBeenCalled();
  });

  it('reports an empty ledger rather than inventing records', async () => {
    const read = jest.fn();
    const list = jest.fn(async () => ({ exists: false }));
    const snapshot = await readDecisions({ workspace: { read, list } } as never, DEFAULT_ADDRESSES);
    expect(snapshot.applicants).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
});

describe('readLedger', () => {
  it('reads signals and flags job-free', async () => {
    const read = jest.fn(async (path: string) =>
      path.endsWith('flags/dev-9903')
        ? { exists: true, value: { sharedWith: ['APP-1063', 'APP-1071'] } }
        : { exists: false },
    );
    const list = jest.fn(async (path: string) =>
      path.endsWith('signals')
        ? { exists: true, keys: ['APP-1060', 'APP-1061'] }
        : { exists: true, keys: ['dev-9903'] },
    );
    const run = jest.fn();
    const venue = { workspace: { read, list }, operations: { run } } as never;

    const snapshot = await readLedger(venue, DEFAULT_ADDRESSES);

    expect(snapshot.signalCount).toBe(2);
    expect(snapshot.flags).toEqual([
      { device: 'dev-9903', record: { sharedWith: ['APP-1063', 'APP-1071'] } },
    ]);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('BeatCard', () => {
  const venue = { venueId: 'test-venue', baseUrl: 'http://venue.test' } as never;

  it('renders narration without a Run button when the beat is not wired', () => {
    render(<BeatCard beat={beat1} venue={venue} enabled={false} />);
    expect(screen.getByTestId('ar-beat-silos')).toHaveTextContent(beat1.title);
    expect(screen.queryByTestId('ar-run-silos')).not.toBeInTheDocument();
  });

  it('shows the disabled hint until the venue is seeded', () => {
    render(
      <BeatCard
        beat={beat1}
        venue={venue}
        enabled={false}
        disabledHint="Run setup above first"
        run={asRun(async () => finishedJob())}
      />,
    );
    expect(screen.getByTestId('ar-run-silos')).toBeDisabled();
    expect(screen.getByTestId('ar-hint-silos')).toHaveTextContent('Run setup above first');
  });

  it('runs the beat and renders the job record with a Jobs deep link', async () => {
    const user = userEvent.setup();
    const run = asRun(async () => finishedJob());
    render(<BeatCard beat={beat1} venue={venue} enabled run={run} />);

    await user.click(screen.getByTestId('ar-run-silos'));

    await waitFor(() =>
      expect(screen.getByTestId('ar-job-silos')).toHaveTextContent('job-77'),
    );
    expect(screen.getByTestId('ar-output-silos')).toHaveTextContent('flagged dev-9903');
    expect(screen.getByTestId('ar-job-link-silos')).toHaveAttribute(
      'href',
      '/venues/test-venue/jobs/job-77',
    );
  });

  it("renders a failure with the job's error string, verbatim", async () => {
    const user = userEvent.setup();
    const denial =
      'Capability denied by gate: gate w/ops/risk/limit-gate: Orchestration step 1 failed';
    const run = asRun(async () =>
      finishedJob({
        isComplete: false,
        metadata: { status: 'FAILED', error: denial },
        output: null,
      }),
    );
    render(<BeatCard beat={beat1} venue={venue} enabled run={run} />);

    await user.click(screen.getByTestId('ar-run-silos'));

    await waitFor(() =>
      expect(screen.getByTestId('ar-error-silos')).toHaveTextContent(denial),
    );
  });
});

describe('extractDenial (beat 3)', () => {
  it("finds the venue's denial nested in an agent task envelope", () => {
    const denial =
      'Error: covia.exception.JobFailedException: Capability denied by gate: gate w/ops/risk/limit-gate: ... output schema violation: $.result.amount: value 2500.0 above maximum 500.0.';
    const state = {
      jobId: 'j1',
      status: 'COMPLETE',
      error: null,
      output: { output: { error: denial, status: 'failed' }, status: 'COMPLETE' },
    };
    expect(extractDenial(state)).toBe(denial);
  });

  it('finds a denial on the job error when the invoke was denied directly', () => {
    const denial = 'Capability denied by gate: gate w/ops/risk/limit-gate: nope';
    expect(
      extractDenial({ jobId: 'j', status: 'FAILED', error: denial, output: null }),
    ).toBe(denial);
  });

  it('returns null rather than claiming a refusal that did not happen', () => {
    expect(
      extractDenial({
        jobId: 'j',
        status: 'COMPLETE',
        error: null,
        output: { output: { decision: { amount: 500 } } },
      }),
    ).toBeNull();
    expect(extractDenial(null)).toBeNull();
  });
});

describe('RefusalPanel', () => {
  it('renders the denial verbatim and names the two-level outcome', () => {
    const denial = 'Capability denied by gate: gate w/ops/risk/limit-gate: refused';
    render(
      <RefusalPanel
        state={{ jobId: 'j', status: 'COMPLETE', error: null, output: { output: { error: denial } } }}
      />,
    );
    expect(screen.getByTestId('ar-refusal-denial')).toHaveTextContent(denial);
    expect(screen.getByTestId('ar-refusal')).toHaveTextContent(/not permitted/i);
    expect(screen.getByTestId('ar-refusal')).toHaveTextContent(/reads COMPLETE/i);
  });

  it('says plainly when the gate did not refuse', () => {
    render(
      <RefusalPanel state={{ jobId: 'j', status: 'COMPLETE', error: null, output: { ok: true } }} />,
    );
    expect(screen.getByTestId('ar-refusal-none')).toHaveTextContent(/did not refuse/i);
  });
});

describe('findOpenAsk (beat 4)', () => {
  it('prefers the newest open ask, so a stale one never captures the deep link', async () => {
    const records: Record<string, unknown> = {
      'h/001': { status: 'answered', title: 'Raise ... S$800 ...' },
      'h/002': { status: 'open', title: 'Raise ... S$800 ...' },
      'h/003': { status: 'open', title: 'Raise ... S$800 ...' },
    };
    const venue = {
      workspace: {
        list: jest.fn(async () => ({ exists: true, keys: ['001', '002', '003'] })),
        read: jest.fn(async (path: string) => ({ exists: true, value: records[path] })),
      },
    } as never;
    expect((await findOpenAsk(venue))?.id).toBe('003');
  });

  it('returns null when nothing is open rather than guessing', async () => {
    const venue = {
      workspace: {
        list: jest.fn(async () => ({ exists: true, keys: ['001'] })),
        read: jest.fn(async () => ({ exists: true, value: { status: 'answered', title: 'S$800' } })),
      },
    } as never;
    expect(await findOpenAsk(venue)).toBeNull();
  });
});

describe('extractGrantToken (beat 4)', () => {
  const jwt =
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6a2V5OnoxMjMiLCJleHAiOjk5OTk5fQ.c2lnbmF0dXJlLWJ5dGVzLWhlcmU';

  it('finds a self-signed COG-19 token under tokens keyed by ask id', () => {
    expect(
      extractGrantToken({ outcome: 'answer', id: 'r1', tokens: { raise: jwt } }),
    ).toBe(jwt);
  });

  it('finds a venue-minted COG-17 grant on token', () => {
    expect(extractGrantToken({ outcome: 'answer', token: jwt })).toBe(jwt);
  });

  it('does not mistake ordinary strings for a token', () => {
    expect(
      extractGrantToken({ outcome: 'answer', comment: 'approved for 7 days', id: 'r1' }),
    ).toBeNull();
    expect(extractGrantToken(null)).toBeNull();
  });
});

describe('reconstruction (beat 5)', () => {
  it('builds a curl that carries identity, since job records are per-caller', () => {
    const curl = reconstructionCurl('http://127.0.0.1:8080/', '0xJOB', 'tok123');
    expect(curl).toContain('Authorization: Bearer tok123');
    expect(curl).toContain('http://127.0.0.1:8080/api/v1/jobs/0xJOB');
    expect(curl).not.toContain('//api'); // trailing slash normalised
  });

  it('falls back to a placeholder rather than a curl that would 404', () => {
    const curl = reconstructionCurl('http://venue.test', '0xJOB', null);
    expect(curl).toContain('$COVIA_TOKEN');
  });

  it('summarises the prev chain oldest-first', () => {
    const record = {
      status: 'COMPLETE',
      caller: 'did:key:zOwner',
      prev: { status: 'STARTED', prev: { status: 'PENDING' } },
    };
    const summary = summariseRecord(record);
    expect(summary.states).toEqual(['PENDING', 'STARTED', 'COMPLETE']);
    expect(summary.prevDepth).toBe(2);
    expect(summary.caller).toBe('did:key:zOwner');
    // actor appears only when the acting principal differs from the owner.
    expect(summary.actor).toBeNull();
  });

  it('reports an actor when the acting principal differs from the owner', () => {
    expect(summariseRecord({ status: 'FAILED', actor: 'did:key:zOwner:g:rk-assessor' }).actor)
      .toBe('did:key:zOwner:g:rk-assessor');
  });

  it('never says "replay" — JOBS.md is reconstruct, never re-execute', () => {
    expect(JOBS_MD_RULE).toMatch(/never re-executes/);
    expect(JOBS_MD_RULE).not.toMatch(/replay/i);
  });
});
