import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockFetchWithError = jest.fn();
jest.mock('@covia/covia-sdk', () => ({
  fetchWithError: (...args: unknown[]) => mockFetchWithError(...args),
}));

const mockRunOperation = jest.fn();
const mockApplyAuth = jest.fn();
const mockVenue: any = {
  venueId: 'venue-1',
  baseUrl: 'https://v',
  metadata: { name: 'Test Venue' },
  auth: { apply: mockApplyAuth },
  operations: { run: mockRunOperation },
};

const mockOwnDid = 'did:key:z6MkSelf';
jest.mock('@/hooks/use-resolved-venue', () => ({
  useResolvedVenueContext: () => ({
    descriptor: mockVenue,
    venue: mockVenue,
    auth: { type: 'keypair', did: mockOwnDid },
    isAuthenticated: true,
    status: 'ready',
    error: null,
  }),
}));

let mockSelectedVenueId: string | null = 'venue-1';
jest.mock('@/hooks/use-venues', () => ({
  ...jest.requireActual('@/hooks/use-venues'),
  useVenues: (select: (state: { selectedVenueId: string | null }) => unknown) =>
    select({ selectedVenueId: mockSelectedVenueId }),
}));

import { ScheduledList } from '@/components/ScheduledList';

function event(handle: string, op: string, msFromNow: number) {
  return { handle, op, time: Date.now() + msFromNow };
}

describe('ScheduledList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedVenueId = 'venue-1';
    mockFetchWithError.mockResolvedValue({
      events: [
        // Padded well past the minute boundary so the countdown's floored
        // minute stays stable across normal test-run latency.
        event('h1', 'v/ops/http/get', 5 * 60_000 + 15_000),
        event('h2', 'v/ops/test/echo', 60_000 + 15_000),
      ],
    });
    mockRunOperation.mockResolvedValue({});
  });

  it('lists pending events via the job-free GET /api/v1/schedules, not an invoke', async () => {
    render(<ScheduledList />);

    await waitFor(() => expect(screen.getAllByText(/v\/ops\//).length).toBe(2));
    expect(mockFetchWithError).toHaveBeenCalledWith(
      'https://v/api/v1/schedules',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockApplyAuth).toHaveBeenCalledWith(expect.any(Object), 'venue-1');
    expect(mockRunOperation).not.toHaveBeenCalled();
    expect(screen.getByText('v/ops/http/get')).toBeInTheDocument();
    expect(screen.getByText('v/ops/test/echo')).toBeInTheDocument();
  });

  it('shows an empty state when there are no scheduled events', async () => {
    mockFetchWithError.mockResolvedValue({ events: [] });
    render(<ScheduledList />);
    expect(await screen.findByText('No scheduled events')).toBeInTheDocument();
  });

  it('cancels an event only after confirming, via scheduler:cancel', async () => {
    const user = userEvent.setup();
    render(<ScheduledList />);
    await screen.findByText('v/ops/http/get');

    const cancelButtons = screen.getAllByRole('button', { name: 'cancel' });
    await user.click(cancelButtons[0]);
    expect(mockRunOperation).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Yes' }));
    await waitFor(() =>
      expect(mockRunOperation).toHaveBeenCalledWith('v/ops/scheduler/cancel', { handle: 'h1' }),
    );
  });

  it('backing out of the cancel confirm never calls scheduler:cancel', async () => {
    const user = userEvent.setup();
    render(<ScheduledList />);
    await screen.findByText('v/ops/http/get');

    await user.click(screen.getAllByRole('button', { name: 'cancel' })[0]);
    await user.click(await screen.findByRole('button', { name: 'No' }));
    expect(mockRunOperation).not.toHaveBeenCalled();
  });

  it('triggers an event now only after confirming, via scheduler:trigger', async () => {
    const user = userEvent.setup();
    render(<ScheduledList />);
    await screen.findByText('v/ops/http/get');

    await user.click(screen.getAllByRole('button', { name: 'trigger now' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Yes' }));
    await waitFor(() =>
      expect(mockRunOperation).toHaveBeenCalledWith('v/ops/scheduler/trigger', { handle: 'h1' }),
    );
  });

  // covia 0.10 (covia#583) lists who scheduled each event, its input and the
  // scheduler's description.
  describe('with 0.10 event details', () => {
    const wake = {
      ...event('h3', 'agent:trigger', 30 * 60_000),
      input: { agentId: 'reporter', force: false, wait: false },
      description: 'Morning summary',
      by: mockOwnDid,
    };
    const queuedByAgent = {
      ...event('h4', 'v/ops/http/get', 40 * 60_000),
      by: `${mockOwnDid}/g/reporter`,
    };

    beforeEach(() => {
      mockFetchWithError.mockResolvedValue({ events: [wake, queuedByAgent] });
    });

    it('labels an event with its description and links an agent wake to its agent', async () => {
      render(<ScheduledList />);

      expect(await screen.findByTestId('schedule-description')).toHaveTextContent('Morning summary');
      expect(screen.getByTestId('schedule-agent')).toHaveAttribute('href', '/agents/agent/reporter');
    });

    it('names the scheduler only when it is not the signed-in account', async () => {
      render(<ScheduledList />);
      await screen.findByTestId('schedule-description');

      const byLines = screen.getAllByTestId('schedule-by');
      expect(byLines).toHaveLength(1);
      expect(byLines[0].closest('tr')).toHaveTextContent('v/ops/http/get');
    });

    it("leaves the agent unlinked when the list is another venue's", async () => {
      mockSelectedVenueId = 'venue-2';
      render(<ScheduledList venueId="venue-1" />);

      const agent = await screen.findByTestId('schedule-agent');
      expect(agent).not.toHaveAttribute('href');
      expect(agent).toHaveTextContent('reporter');
    });
  });

  it('shows a live next-run countdown derived from the fire time', async () => {
    render(<ScheduledList />);
    await screen.findByText('v/ops/http/get');
    expect(screen.getByText(/in 5 min/)).toBeInTheDocument();
    expect(screen.getByText(/in 1 min/)).toBeInTheDocument();
  });
});
