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

jest.mock('@/hooks/use-resolved-venue', () => ({
  useResolvedVenueContext: () => ({
    descriptor: mockVenue,
    venue: mockVenue,
    auth: { type: 'keypair' },
    isAuthenticated: true,
  }),
}));
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue] }),
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
    // Job names now render in both the desktop table and the mobile card
    // list (CSS hides one; jsdom keeps both in the DOM), so match all.
    expect((await screen.findAllByText('job-997')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('job-988').length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing 10 of 998/)).toBeInTheDocument();

    expect(mockVenue.jobs.list).not.toHaveBeenCalled();
    expect(mockVenue.jobs.get).not.toHaveBeenCalled();
    // The heavy FILTER_WINDOW read is deferred until filters are used —
    // a plain page load fetches exactly one count probe and one page slice.
    expect(mockVenue.workspace.slice).not.toHaveBeenCalledWith('j', TOTAL - 100, 100);
    expect(mockVenue.workspace.list).toHaveBeenCalledTimes(1);
  });

  it('search fetches one filter window instead of per-job GETs', async () => {
    const user = userEvent.setup();
    render(<JobList />);
    await screen.findAllByText('job-997');

    // Search now lives inside the Filters sheet — open it, type, and commit
    // via "Apply Filters" (edits are staged until then).
    await user.click(screen.getByTestId('filters-trigger'));
    await user.type(await screen.findByPlaceholderText(/Search by id/), 'job-9');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    // One FILTER_WINDOW-record window: slice('j', 898, 100), after the 300ms debounce.
    await waitFor(() => {
      expect(mockVenue.workspace.slice).toHaveBeenCalledWith('j', TOTAL - 100, 100);
    });
    expect(mockVenue.jobs.get).not.toHaveBeenCalled();
    // The window fetch reuses the count learned by the initial page slice —
    // no second list() probe.
    expect(mockVenue.workspace.list).toHaveBeenCalledTimes(1);
  });

  it('recovers from a stale count between list() and slice() (#193)', async () => {
    // The list() probe reads count=990, but the index has already grown to
    // TOTAL (998) by the time slice() runs — the stale-count race behind
    // #193. The same correction covers a stale cached count reused on
    // pagination/refresh.
    const guessCount = 990;
    mockVenue.workspace.list.mockResolvedValue({ exists: true, count: guessCount, keys: [] });
    mockVenue.workspace.slice.mockImplementation((_p: string, offset: number, limit: number) =>
      Promise.resolve({
        exists: true,
        count: TOTAL, // slice's own response carries the live count
        values: Array.from({ length: limit }, (_, i) => ({
          key: String(offset + i).padStart(4, '0'),
          value: record(offset + i),
        })),
      }));

    render(<JobList />);

    // Page window is first computed against the stale guess (ranks
    // 980..989), then recomputed against the live count once slice's
    // response disagrees with it (998 !== 990), landing on 988..997.
    await waitFor(() => {
      expect(mockVenue.workspace.slice).toHaveBeenCalledWith('j', guessCount - 10, 10);
    });
    await waitFor(() => {
      expect(mockVenue.workspace.slice).toHaveBeenCalledWith('j', TOTAL - 10, 10);
    });

    // 988..997 (corrected) and 980..989 (stale) overlap at 988-989, so
    // assert on ranks unique to each: 997 only in the corrected window,
    // 980 only in the stale one.
    expect((await screen.findAllByText('job-997')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('job-980')).toHaveLength(0);
    expect(screen.getByText(/Showing 10 of 998/)).toBeInTheDocument();
  });
});

describe('JobList trend sparklines (#225)', () => {
  beforeEach(() => {
    mockVenue.workspace.list.mockClear();
    mockVenue.workspace.slice.mockClear();
  });

  it('shows a trend sparkline on Success Rate and Latency, not Total Jobs', async () => {
    render(<JobList />);
    await screen.findAllByText('job-997');

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Success Rate trend' })).toBeInTheDocument();
    });
    expect(screen.getByRole('img', { name: 'Latency (p50) trend' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Total Jobs trend' })).not.toBeInTheDocument();
  });

  it('sources the headline stats from the recent venue window, labelled honestly', async () => {
    render(<JobList />);
    await screen.findAllByText('job-997');

    // The stats window is all COMPLETE → 100%, captioned "last N jobs"
    // (venue-wide), not the misleading page-scoped "of 10 jobs on this page".
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/last \d+ jobs/).length).toBeGreaterThan(0);
    expect(screen.queryByText('of 10 jobs on this page')).not.toBeInTheDocument();
  });

  it('renders both the desktop table row and the mobile card for a job, and the new tiles', async () => {
    render(<JobList />);
    await screen.findAllByText('job-997');

    // Dual layout: each job appears in the (md+) table and the mobile card list.
    expect(screen.getAllByText('job-997').length).toBeGreaterThanOrEqual(2);
    // The redesigned stat band adds Latency and Failures tiles.
    await waitFor(() => {
      expect(screen.getByText('Latency (p50)')).toBeInTheDocument();
    });
    expect(screen.getByText('Failures')).toBeInTheDocument();
  });
});
