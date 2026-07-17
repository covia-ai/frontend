import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('@/components/admin-panel/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock('@/components/PaginationHeader', () => ({
  PaginationHeader: ({ currentPage, totalPages }: any) => (
    <div data-testid="pagination">{currentPage}/{totalPages}</div>
  ),
}));

// 998 jobs on the venue; the index serves windowed slices oldest-first.
const TOTAL = 998;
const record = (rank: number) => ({
  id: `0x${String(rank).padStart(4, '0')}`,
  name: `job-${rank}`,
  status: 'COMPLETE',
  created: 1783671875945 + rank,
  updated: 1783671875999 + rank,
});

const mockVenue: any = {
  venueId: 'venue-1',
  metadata: { name: 'Test Venue' },
  workspace: {
    list: jest.fn().mockResolvedValue({ exists: true, count: TOTAL, keys: [] }),
    slice: jest.fn((_path: string, offset: number, limit: number) =>
      Promise.resolve({
        exists: true,
        count: TOTAL,
        values: Array.from({ length: limit }, (_, i) => ({
          key: String(offset + i).padStart(4, '0'),
          value: record(offset + i),
        })),
      })),
  },
  // The old implementation went through these — they must stay untouched.
  jobs: { list: jest.fn(), get: jest.fn() },
};

jest.mock('@/hooks/use-venue-for-route', () => ({
  useVenueForRoute: () => mockVenue,
}));
jest.mock('@/hooks/use-authenticated-venue', () => ({
  getVenueFor: () => mockVenue,
}));
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue] }),
}));
const mockAuthMap = {};
const mockGetAuthForVenue = jest.fn().mockReturnValue({ type: 'keypair' });
jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: (selector: any) =>
    selector({ authMap: mockAuthMap, getAuthForVenue: mockGetAuthForVenue }),
}));

import { JobList } from '@/components/JobList';

describe('JobList windowed fetching', () => {
  beforeEach(() => {
    mockVenue.workspace.list.mockClear();
    mockVenue.workspace.slice.mockClear();
    mockVenue.jobs.list.mockClear();
    mockVenue.jobs.get.mockClear();
  });

  it('loads a page as one newest-window slice — no full id list, no per-job GETs', async () => {
    render(<JobList />);

    // Page 1 of 998 newest-first = ranks 988..997, i.e. slice('j', 988, 10).
    await waitFor(() => {
      expect(mockVenue.workspace.slice).toHaveBeenCalledWith('j', TOTAL - 10, 10);
    });
    expect(await screen.findByText('job-997')).toBeInTheDocument();
    expect(screen.getByText('job-988')).toBeInTheDocument();
    expect(screen.getByText(/Showing 10 of 998/)).toBeInTheDocument();

    expect(mockVenue.jobs.list).not.toHaveBeenCalled();
    expect(mockVenue.jobs.get).not.toHaveBeenCalled();
  });

  it('search fetches one filter window instead of per-job GETs', async () => {
    const user = userEvent.setup();
    render(<JobList />);
    await screen.findByText('job-997');

    await user.type(screen.getByPlaceholderText(/Search by id/), 'job-9');

    // One 100-record window: slice('j', 898, 100), after the 300ms debounce.
    await waitFor(() => {
      expect(mockVenue.workspace.slice).toHaveBeenCalledWith('j', TOTAL - 100, 100);
    });
    expect(mockVenue.jobs.get).not.toHaveBeenCalled();
  });
});
