import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockResolve = jest.fn();
jest.mock('@/lib/operations-catalog', () => ({
  resolveOperationByAddress: (...args: unknown[]) => mockResolve(...args),
}));

import { runBeat1, readLedger, AGENT_REQUEST_OP } from '@/components/adaptive-risk/beats';
import { BeatCard } from '@/components/adaptive-risk/BeatCard';
import { DEFAULT_ADDRESSES } from '@/components/adaptive-risk/fixtures';
import { ADAPTIVE_RISK_BEATS } from '@/components/adaptive-risk/story';

const beat1 = ADAPTIVE_RISK_BEATS[0];

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
    const invoke = jest.fn(async () => finishedJob());
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
        run={jest.fn()}
      />,
    );
    expect(screen.getByTestId('ar-run-silos')).toBeDisabled();
    expect(screen.getByTestId('ar-hint-silos')).toHaveTextContent('Run setup above first');
  });

  it('runs the beat and renders the job record with a Jobs deep link', async () => {
    const user = userEvent.setup();
    const run = jest.fn(async () => finishedJob());
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
    const run = jest.fn(async () =>
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
