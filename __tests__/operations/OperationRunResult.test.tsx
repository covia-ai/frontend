import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockLifecycle = jest.fn();
jest.mock('@/hooks/use-execution-lifecycle', () => ({
  useExecutionLifecycle: (...args: any[]) => mockLifecycle(...args),
}));
jest.mock('@/components/execution/ExecutionDataTable', () => ({
  ExecutionDataTable: () => <div data-testid="execution-data-table" />,
}));

import { OperationRunResult } from '@/components/execution/OperationRunResult';

const base = {
  job: undefined,
  operationAsset: undefined,
  loading: false,
  error: null,
  notFound: false,
  streaming: false,
};

describe('OperationRunResult', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the status and output once the job resolves', () => {
    mockLifecycle.mockReturnValue({
      ...base,
      job: { status: 'COMPLETE', output: { text: 'hi' } },
    });

    render(<OperationRunResult jobId="job-1" venueId="venue-1" />);

    expect(screen.getByTestId('operation-run-result')).toBeInTheDocument();
    expect(screen.getByTestId('execution-data-table')).toBeInTheDocument();
  });

  // The hook reports a missing job as `notFound` with `error` nulled. Without
  // an explicit branch this fell through to `!job` and rendered nothing, so the
  // caller's bordered result panel sat empty with no explanation.
  it('explains a job that no longer exists instead of rendering nothing', () => {
    mockLifecycle.mockReturnValue({ ...base, notFound: true });

    render(<OperationRunResult jobId="job-gone" venueId="venue-1" />);

    expect(screen.getByTestId('operation-run-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('operation-run-result')).not.toBeInTheDocument();
  });

  it('shows the error when the lifecycle fails for another reason', () => {
    mockLifecycle.mockReturnValue({ ...base, error: 'network request failed' });

    render(<OperationRunResult jobId="job-1" venueId="venue-1" />);

    // ErrorDisplay summarises the raw message; "Connection error" is its
    // summary for a network failure.
    expect(screen.getByText('Connection error')).toBeInTheDocument();
    expect(screen.queryByTestId('operation-run-not-found')).not.toBeInTheDocument();
  });
});
