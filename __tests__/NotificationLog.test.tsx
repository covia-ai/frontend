import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { NotificationLog } from '@/components/NotificationLog';
import { useNotificationLog } from '@/hooks/use-notification-log';

describe('NotificationLog', () => {
  beforeEach(() => {
    useNotificationLog.getState().clear();
  });

  it('shows an empty state when nothing has been recorded', () => {
    render(<NotificationLog />);
    expect(screen.getByTestId('notification-log')).toBeInTheDocument();
    expect(screen.queryAllByTestId('notification-entry')).toHaveLength(0);
    expect(screen.queryByTestId('notification-log-clear')).not.toBeInTheDocument();
  });

  it('lists recorded notifications newest first with kind and description', () => {
    useNotificationLog.getState().record('success', 'Saved successfully');
    useNotificationLog.getState().record('error', 'Unable to save', 'HTTP 401');

    render(<NotificationLog />);
    const entries = screen.getAllByTestId('notification-entry');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveAttribute('data-kind', 'error');
    expect(entries[0]).toHaveTextContent('Unable to save');
    expect(entries[0]).toHaveTextContent('HTTP 401');
    expect(entries[1]).toHaveAttribute('data-kind', 'success');
  });

  it('clears the log via the Clear control', async () => {
    useNotificationLog.getState().record('info', 'Something happened');
    const user = userEvent.setup();

    render(<NotificationLog />);
    await user.click(screen.getByTestId('notification-log-clear'));

    expect(screen.queryAllByTestId('notification-entry')).toHaveLength(0);
    expect(useNotificationLog.getState().entries).toHaveLength(0);
  });
});
