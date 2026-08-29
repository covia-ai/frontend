import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();
jest.mock('@/lib/notify', () => ({
  notifySuccess: (...args: unknown[]) => mockNotifySuccess(...args),
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
}));

import { SchedulePickerDialog } from '@/components/SchedulePickerDialog';

const mockRunOperation = jest.fn();
const mockVenue: any = {
  operations: { run: mockRunOperation },
};

describe('SchedulePickerDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunOperation.mockResolvedValue({});
  });

  it('defaults to "Once at…" and requires a time before submitting', async () => {
    const user = userEvent.setup();
    render(<SchedulePickerDialog venue={mockVenue} operation="v/ops/test/echo" input={{}} />);

    await user.click(screen.getByRole('button', { name: /run on a schedule/i }));
    await user.click(await screen.findByRole('button', { name: 'Schedule' }));

    expect(mockRunOperation).not.toHaveBeenCalled();
    expect(await screen.findByText(/pick a date and time/i)).toBeInTheDocument();
  });

  it('submits a one-shot schedule with an absolute time', async () => {
    const user = userEvent.setup();
    render(<SchedulePickerDialog venue={mockVenue} operation="v/ops/test/echo" input={{ a: 1 }} />);

    await user.click(screen.getByRole('button', { name: /run on a schedule/i }));
    const timeInput = await screen.findByLabelText(/date and time/i);
    await user.type(timeInput, '2030-01-01T00:00');
    await user.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() =>
      expect(mockRunOperation).toHaveBeenCalledWith('v/ops/scheduler/schedule', {
        operation: 'v/ops/test/echo',
        input: { a: 1 },
        time: new Date('2030-01-01T00:00').getTime(),
      }),
    );
    expect(mockNotifySuccess).toHaveBeenCalledWith(
      'Schedule created',
      expect.objectContaining({ receiptHref: '/jobs?tab=scheduled' }),
    );
  });

  it.each([
    ['Hourly', 3_600_000],
    ['Daily', 86_400_000],
    ['Weekly', 604_800_000],
  ])('submits a %s preset as repeat.every', async (label, everyMs) => {
    const user = userEvent.setup();
    render(<SchedulePickerDialog venue={mockVenue} operation="agent:trigger" input={{ agentId: 'a1' }} />);

    await user.click(screen.getByRole('button', { name: /run on a schedule/i }));
    await user.click(screen.getByRole('radio', { name: label }));
    await user.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() =>
      expect(mockRunOperation).toHaveBeenCalledWith('v/ops/scheduler/schedule', {
        operation: 'agent:trigger',
        input: { agentId: 'a1' },
        repeat: { every: everyMs },
      }),
    );
  });

  it('does not offer a cron option', async () => {
    const user = userEvent.setup();
    render(<SchedulePickerDialog venue={mockVenue} operation="v/ops/test/echo" input={{}} />);

    await user.click(screen.getByRole('button', { name: /run on a schedule/i }));
    expect(screen.queryByText(/cron/i)).not.toBeInTheDocument();
  });

  it('surfaces a failure via notifyError without closing the dialog', async () => {
    mockRunOperation.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<SchedulePickerDialog venue={mockVenue} operation="v/ops/test/echo" input={{}} />);

    await user.click(screen.getByRole('button', { name: /run on a schedule/i }));
    await user.click(screen.getByRole('radio', { name: 'Hourly' }));
    await user.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() =>
      expect(mockNotifyError).toHaveBeenCalledWith('Unable to create schedule', expect.any(Error)),
    );
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();
  });

  it('disables the trigger when no venue is resolved', () => {
    render(<SchedulePickerDialog venue={null} operation="v/ops/test/echo" input={{}} />);
    expect(screen.getByRole('button', { name: /run on a schedule/i })).toBeDisabled();
  });
});
