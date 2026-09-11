import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Every operation shares the /operations/[...id] route, so switching
// operations reuses one OperationViewer instance. These tests pin the
// run-in-place state to the asset it belongs to.

const mockVenue: any = { venueId: 'venue-1', baseUrl: 'http://localhost:8080', metadata: { name: 'Test Venue' } };

jest.mock('@/hooks/use-resolved-venue', () => ({
  useResolvedVenueContext: () => ({ venue: mockVenue, isAuthenticated: true }),
}));

const mockUseOperationAsset = jest.fn();
jest.mock('@/hooks/use-operation-asset', () => ({
  useOperationAsset: (...args: any[]) => mockUseOperationAsset(...args),
}));

jest.mock('@/hooks/use-operation-input', () => ({
  useOperationInput: () => ({
    ready: true,
    input: {},
    rawInput: {},
    typeMap: {},
    setValue: jest.fn(),
    setRawValue: jest.fn(),
    setType: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Drive the run straight through the caller's onSuccess, as the real hook does
// once the venue returns a job id.
jest.mock('@/hooks/use-job-execution', () => ({
  useJobExecution: () => ({
    running: false,
    execute: async ({ onSuccess }: any) => onSuccess('job-abc'),
  }),
}));

jest.mock('@/components/execution/OperationRunResult', () => ({
  OperationRunResult: ({ jobId }: any) => <div data-testid="run-result">{jobId}</div>,
}));
jest.mock('@/components/admin-panel/TopBar', () => ({ TopBar: () => <div /> }));
jest.mock('@/components/admin-panel/content-layout', () => ({
  ContentLayout: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/AssetHeader', () => ({ AssetHeader: () => <div /> }));
jest.mock('@/components/MetadataViewer', () => ({ MetadataViewer: () => <div /> }));
jest.mock('@/components/OperationCodeSnippets', () => ({ OperationCodeSnippets: () => <div /> }));
jest.mock('@/components/OperationInputForm', () => ({
  OperationInputForm: ({ onRun }: any) => (
    <button type="button" onClick={onRun}>
      Run operation
    </button>
  ),
}));

import { OperationViewer } from '@/components/OperationViewer';

function assetFor(id: string) {
  return {
    id,
    metadata: {
      name: `Operation ${id}`,
      operation: { adapter: 'http', input: { properties: { a: { type: 'string' } } } },
    },
    invoke: jest.fn().mockResolvedValue({ id: 'job-abc' }),
  };
}

describe('OperationViewer run-in-place', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOperationAsset.mockImplementation((_venue: any, assetId: string) => ({
      asset: assetFor(assetId),
      errorMessage: '',
      notFound: false,
      loading: false,
    }));
  });

  it('shows the inline result once a run returns a job id', async () => {
    render(<OperationViewer assetId="op-1" venueId="venue-1" />);

    expect(screen.queryByTestId('operation-inline-result')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Run operation'));

    expect(await screen.findByTestId('run-result')).toHaveTextContent('job-abc');
  });

  it('drops the previous operation result when the asset changes', async () => {
    const { rerender } = render(<OperationViewer assetId="op-1" venueId="venue-1" />);
    await userEvent.click(screen.getByText('Run operation'));
    expect(await screen.findByTestId('run-result')).toBeInTheDocument();

    rerender(<OperationViewer assetId="op-2" venueId="venue-1" />);

    await waitFor(() =>
      expect(screen.queryByTestId('operation-inline-result')).not.toBeInTheDocument(),
    );
  });
});
