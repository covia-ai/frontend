import '@testing-library/jest-dom';

const mockSonner = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};
jest.mock('sonner', () => ({ toast: mockSonner }));

import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '@/lib/notify';
import { useNotificationLog, MAX_LOG_ENTRIES } from '@/hooks/use-notification-log';

describe('notify helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationLog.getState().clear();
  });

  it('names the unreachable target on bare network failures', () => {
    notifyError('Unable to store secret', new TypeError('Failed to fetch'), 'http://localhost:8080');

    const [, opts] = mockSonner.error.mock.calls[0];
    // The target URL must be in the detail — "Failed to fetch" alone is useless.
    expect(opts.description).toContain('http://localhost:8080');
    expect(opts.description).toContain('Failed to fetch');
  });

  it('passes server error messages through unchanged', () => {
    notifyError('Unable to store secret', new Error('HTTP 401: Request failed with status 401'), 'http://localhost:8080');

    const [, opts] = mockSonner.error.mock.calls[0];
    expect(opts.description).toBe('HTTP 401: Request failed with status 401');
  });

  it('offers a copy action carrying the full detail', () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
    notifyError('Oops', new TypeError('Failed to fetch'), 'http://x');

    const [, opts] = mockSonner.error.mock.calls[0];
    opts.action.onClick();
    const copied = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(copied).toContain('Oops');
    expect(copied).toContain('http://x');
  });

  it('tolerates a missing error — title-only failure toast', () => {
    notifyError('Unable to prepare agent');

    const [title, opts] = mockSonner.error.mock.calls[0];
    expect(title).toBe('Unable to prepare agent');
    expect(opts.description).toBeUndefined();
  });

  it('routes each kind to the matching sonner variant', () => {
    notifySuccess('Saved');
    notifyWarning('Careful');
    notifyInfo('FYI');
    expect(mockSonner.success).toHaveBeenCalledWith('Saved', undefined);
    expect(mockSonner.warning).toHaveBeenCalledWith('Careful', undefined);
    expect(mockSonner.info).toHaveBeenCalledWith('FYI', undefined);
  });

  it('records every notification to the session log, newest first', () => {
    notifySuccess('Saved', { description: 'w/notes' });
    notifyError('Unable to save', new Error('disk full'));

    const { entries } = useNotificationLog.getState();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ kind: 'error', title: 'Unable to save', description: 'disk full' });
    expect(entries[1]).toMatchObject({ kind: 'success', title: 'Saved', description: 'w/notes' });
  });

  it('caps the log so a long session cannot grow it unbounded', () => {
    for (let i = 0; i < MAX_LOG_ENTRIES + 25; i++) notifyInfo(`n${i}`);
    const { entries } = useNotificationLog.getState();
    expect(entries).toHaveLength(MAX_LOG_ENTRIES);
    expect(entries[0].title).toBe(`n${MAX_LOG_ENTRIES + 24}`); // newest kept
  });

  it('clear() empties the log', () => {
    notifyInfo('one');
    useNotificationLog.getState().clear();
    expect(useNotificationLog.getState().entries).toHaveLength(0);
  });
});
