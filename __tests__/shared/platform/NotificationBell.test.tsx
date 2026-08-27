import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { NotificationBell } from '@/components/NotificationBell';
import { useNotificationLog } from '@/hooks/use-notification-log';
import { useVenues } from '@/hooks/use-venues';

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useNotificationLog.getState().clear();
      useVenues.setState({
        venues: [{ venueId: 'v1', baseUrl: 'https://v1.test', metadata: { name: 'Venue One' } }],
        selectedVenueId: null,
      });
    });
  });

  it('renders no unread badge when everything is read (or empty)', () => {
    render(<NotificationBell />);
    expect(screen.queryByTestId('notification-bell-count')).not.toBeInTheDocument();
  });

  it('shows the unread count, capped at 99+', () => {
    act(() => {
      for (let i = 0; i < 150; i++) useNotificationLog.getState().record('info', `n${i}`);
    });
    render(<NotificationBell />);
    expect(screen.getByTestId('notification-bell-count')).toHaveTextContent('99+');
  });

  it('groups entries by venue, with venue name resolved and unscoped entries under "Other"', async () => {
    const user = userEvent.setup();
    act(() => {
      useNotificationLog.getState().record('error', 'Job failed', undefined, '/venues/v1/jobs/j1');
      useNotificationLog.getState().record('success', 'Plain toast'); // no receipt -> unscoped
    });
    render(<NotificationBell />);
    await user.click(screen.getByTestId('notification-bell-trigger'));

    expect(await screen.findByText('Venue One')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Job failed')).toBeInTheDocument();
    expect(screen.getByText('Plain toast')).toBeInTheDocument();
  });

  it('marks an entry read and navigates to its receipt on click', async () => {
    const user = userEvent.setup();
    act(() => {
      useNotificationLog.getState().record('error', 'Job failed', undefined, '/venues/v1/jobs/j1');
    });
    render(<NotificationBell />);
    await user.click(screen.getByTestId('notification-bell-trigger'));
    await user.click(await screen.findByText('Job failed'));

    expect(mockPush).toHaveBeenCalledWith('/venues/v1/jobs/j1');
    expect(useNotificationLog.getState().entries[0].read).toBe(true);
  });

  it('marks a receipt-less entry read on click without navigating', async () => {
    const user = userEvent.setup();
    act(() => {
      useNotificationLog.getState().record('success', 'Plain toast');
    });
    render(<NotificationBell />);
    await user.click(screen.getByTestId('notification-bell-trigger'));
    await user.click(await screen.findByText('Plain toast'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(useNotificationLog.getState().entries[0].read).toBe(true);
  });

  it('"Mark all read" clears the unread count without navigating', async () => {
    const user = userEvent.setup();
    act(() => {
      useNotificationLog.getState().record('info', 'One');
      useNotificationLog.getState().record('info', 'Two');
    });
    render(<NotificationBell />);
    await user.click(screen.getByTestId('notification-bell-trigger'));
    await user.click(await screen.findByTestId('notification-bell-mark-all-read'));

    expect(useNotificationLog.getState().entries.every((e) => e.read)).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows an empty state when there are no notifications', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByTestId('notification-bell-trigger'));
    expect(await screen.findByText(/Nothing yet/)).toBeInTheDocument();
  });
});
