import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stable venue reference so effects keyed on [venue] don't refire per render.
// Mutable holder so individual tests can simulate the no-venue state.
const mockVenueHolder: { venue: { venueId: string } | null } = {
  venue: { venueId: 'test-venue' },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenueHolder.venue,
}));

jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => true,
}));

const mockResolve = jest.fn();
jest.mock('@/lib/operations-catalog', () => ({
  resolveOperationByAddress: (...args: unknown[]) => mockResolve(...args),
}));

import { JobLifecycleDemo } from '@/components/JobLifecycleDemo';

// A job that is already terminal when invoke resolves — the watch loop's
// timer path is skipped, keeping the test on real timers.
function finishedJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-123',
    metadata: { status: 'COMPLETE' },
    isFinished: true,
    isComplete: true,
    output: { message: 'Hello, Covia!' },
    refresh: jest.fn(),
    ...overrides,
  };
}

describe('JobLifecycleDemo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenueHolder.venue = { venueId: 'test-venue' };
  });

  it('renders all four lifecycle steps idle before a run', () => {
    render(<JobLifecycleDemo />);
    for (const step of ['resolve', 'invoke', 'watch', 'result']) {
      expect(screen.getByTestId(`demo-step-${step}`)).toHaveAttribute('data-state', 'idle');
    }
    expect(screen.getByTestId('demo-run')).toBeEnabled();
  });

  it('disables the run button when no venue is connected', () => {
    mockVenueHolder.venue = null;
    render(<JobLifecycleDemo />);
    expect(screen.getByTestId('demo-run')).toBeDisabled();
  });

  it('resolves the delay op and invokes it with the echo op and typed message', async () => {
    const invoke = jest.fn().mockResolvedValue(finishedJob());
    mockResolve.mockResolvedValue({ metadata: { name: 'Delay Operation' }, invoke });

    const user = userEvent.setup();
    render(<JobLifecycleDemo />);

    const input = screen.getByTestId('demo-message');
    await user.clear(input);
    await user.type(input, 'round trip');
    await user.click(screen.getByTestId('demo-run'));

    await waitFor(() =>
      expect(screen.getByTestId('demo-step-result')).toHaveAttribute('data-state', 'done'),
    );

    expect(mockResolve).toHaveBeenCalledWith(mockVenueHolder.venue, 'v/test/ops/delay');
    expect(invoke).toHaveBeenCalledWith({
      operation: 'v/test/ops/echo',
      delay: 2000,
      input: { message: 'round trip' },
    });
  });

  it('shows the job id and the job output after a successful run', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValue(finishedJob({ output: { message: 'echoed back' } }));
    mockResolve.mockResolvedValue({ metadata: { name: 'Delay Operation' }, invoke });

    const user = userEvent.setup();
    render(<JobLifecycleDemo />);
    await user.click(screen.getByTestId('demo-run'));

    await waitFor(() => expect(screen.getByTestId('demo-output')).toBeInTheDocument());
    expect(screen.getByTestId('demo-job-id')).toHaveTextContent('job-123');
    expect(screen.getByTestId('demo-output')).toHaveTextContent('echoed back');
    expect(screen.getByTestId('demo-job-link')).toHaveAttribute(
      'href',
      '/venues/test-venue/jobs/job-123',
    );
    expect(screen.getByTestId('demo-timeline')).toHaveTextContent('COMPLETE');
  });

  it('marks the invoke step as failed when the invocation is rejected', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('venue rejected the invocation'));
    mockResolve.mockResolvedValue({ metadata: { name: 'Delay Operation' }, invoke });

    const user = userEvent.setup();
    render(<JobLifecycleDemo />);
    await user.click(screen.getByTestId('demo-run'));

    await waitFor(() =>
      expect(screen.getByTestId('demo-step-invoke')).toHaveAttribute('data-state', 'error'),
    );
    // The message must sit inside the failed step, where the red border is —
    // not somewhere below the fold.
    expect(
      within(screen.getByTestId('demo-step-invoke')).getByTestId('demo-error'),
    ).toHaveTextContent('venue rejected the invocation');
    expect(screen.getByTestId('demo-step-resolve')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('demo-step-watch')).toHaveAttribute('data-state', 'idle');
  });

  it('surfaces a non-COMPLETE terminal status as a result-step failure', async () => {
    const invoke = jest.fn().mockResolvedValue(
      finishedJob({
        metadata: { status: 'FAILED', error: 'adapter exploded' },
        isComplete: false,
      }),
    );
    mockResolve.mockResolvedValue({ metadata: { name: 'Delay Operation' }, invoke });

    const user = userEvent.setup();
    render(<JobLifecycleDemo />);
    await user.click(screen.getByTestId('demo-run'));

    await waitFor(() =>
      expect(screen.getByTestId('demo-step-result')).toHaveAttribute('data-state', 'error'),
    );
    expect(
      within(screen.getByTestId('demo-step-result')).getByTestId('demo-error'),
    ).toHaveTextContent('adapter exploded');
  });

  it('falls back to output.error when a failed job has no top-level error field', async () => {
    const invoke = jest.fn().mockResolvedValue(
      finishedJob({
        metadata: { status: 'FAILED', output: { error: 'tool call denied' } },
        isComplete: false,
      }),
    );
    mockResolve.mockResolvedValue({ metadata: { name: 'Delay Operation' }, invoke });

    const user = userEvent.setup();
    render(<JobLifecycleDemo />);
    await user.click(screen.getByTestId('demo-run'));

    await waitFor(() =>
      expect(screen.getByTestId('demo-step-result')).toHaveAttribute('data-state', 'error'),
    );
    expect(screen.getByTestId('demo-error')).toHaveTextContent('tool call denied');
  });

  it('shows the error name when a thrown error has an empty message', async () => {
    const blankError = new Error('');
    blankError.name = 'CoviaConnectionError';
    mockResolve.mockRejectedValue(blankError);

    const user = userEvent.setup();
    render(<JobLifecycleDemo />);
    await user.click(screen.getByTestId('demo-run'));

    await waitFor(() =>
      expect(screen.getByTestId('demo-step-resolve')).toHaveAttribute('data-state', 'error'),
    );
    expect(
      within(screen.getByTestId('demo-step-resolve')).getByTestId('demo-error'),
    ).toHaveTextContent('CoviaConnectionError');
  });
});
