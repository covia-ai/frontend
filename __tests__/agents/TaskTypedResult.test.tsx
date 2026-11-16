import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RunStatus } from '@covia/covia-sdk';

const mockGet = jest.fn();
const mockVenue = { venueId: 'did:web:venue.example', jobs: { get: mockGet } };
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { TaskTypedResult } from '@/components/typed-result/TaskTypedResult';

const TABLE_SCHEMA = {
  type: 'array',
  items: { type: 'object', properties: { name: { type: 'string' }, score: { type: 'number' } } },
};

// How the venue settles a request job (covia AgentAdapter.completion).
const envelope = (output: unknown) => ({ id: '0xabc', status: 'COMPLETE', output, sessionId: '01' });

const job = (overrides: Record<string, unknown>) => ({
  metadata: {
    id: 'abc',
    status: RunStatus.COMPLETE,
    input: { agentId: 'helper', input: 'rank them', responseSchema: TABLE_SCHEMA, strict: true },
    output: envelope([{ name: 'Ada', score: 3 }]),
    ...overrides,
  },
});

// Each test uses its own job id: finished jobs are cached per (venue, job).
let seq = 0;
const nextId = () => `0xjob${++seq}`;

describe('TaskTypedResult', () => {
  beforeEach(() => mockGet.mockReset());

  it('renders a completed typed request as a table with the validated badge', async () => {
    mockGet.mockResolvedValue(job({}));
    const id = nextId();
    render(<TaskTypedResult jobId={id} revision={1} />);

    expect(await screen.findByTestId('task-typed-result')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open job/i })).toHaveAttribute('href', expect.stringContaining(id));
    expect(mockGet).toHaveBeenCalledWith(id);
  });

  it('renders nothing for an untyped request', async () => {
    mockGet.mockResolvedValue(job({ input: { agentId: 'helper', input: 'hi' } }));
    render(<TaskTypedResult jobId={nextId()} revision={1} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('task-typed-result')).not.toBeInTheDocument();
  });

  it('renders nothing when the agent ended the task with a plain reply', async () => {
    mockGet.mockResolvedValue(job({ output: envelope('Ada is first.') }));
    render(<TaskTypedResult jobId={nextId()} revision={1} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('task-typed-result')).not.toBeInTheDocument();
  });

  it('re-reads a running job when the transcript changes, then shows its result', async () => {
    mockGet.mockResolvedValueOnce(job({ status: RunStatus.STARTED, output: undefined }));
    const id = nextId();
    const { rerender } = render(<TaskTypedResult jobId={id} revision={1} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('task-typed-result')).not.toBeInTheDocument();

    mockGet.mockResolvedValueOnce(job({}));
    rerender(<TaskTypedResult jobId={id} revision={2} />);
    expect(await screen.findByTestId('task-typed-result')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('does not re-read a finished job', async () => {
    mockGet.mockResolvedValue(job({}));
    const id = nextId();
    const { rerender } = render(<TaskTypedResult jobId={id} revision={1} />);
    await screen.findByTestId('task-typed-result');
    rerender(<TaskTypedResult jobId={id} revision={2} />);
    rerender(<TaskTypedResult jobId={id} revision={3} />);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('renders nothing for a failed request', async () => {
    mockGet.mockResolvedValue(job({ status: RunStatus.FAILED }));
    render(<TaskTypedResult jobId={nextId()} revision={1} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('task-typed-result')).not.toBeInTheDocument();
  });
});
