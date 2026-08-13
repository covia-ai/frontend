import '@testing-library/jest-dom';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

import { jobFailure, notifyError, notifyInfo, notifySuccess, notifyWarning } from '@/lib/notify';
import { useNotificationLog, MAX_LOG_ENTRIES } from '@/hooks/use-notification-log';
import { JobFailedError, type JobMetadata } from '@covia/covia-sdk';
import { toast } from 'sonner';

const mockSonner = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
  warning: jest.Mock;
  info: jest.Mock;
};

function jobFailedError(overrides: Partial<JobMetadata> = {}): JobFailedError {
  return new JobFailedError({
    id: '0x019fd5dae9aa0000ea26d3ef7c4509f6',
    status: 'FAILED',
    error: "Cannot resume agent 'x': status is SLEEPING; agent:resume requires SUSPENDED",
    ...overrides,
  });
}

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

  it('routes each kind to the matching sonner variant, each dismissable', () => {
    notifySuccess('Saved');
    notifyWarning('Careful');
    notifyInfo('FYI');
    expect(mockSonner.success).toHaveBeenCalledWith('Saved', { closeButton: true });
    expect(mockSonner.warning).toHaveBeenCalledWith('Careful', { closeButton: true });
    expect(mockSonner.info).toHaveBeenCalledWith('FYI', { closeButton: true });
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

  describe('jobFailure', () => {
    it('extracts the real reason and a job link from a JobFailedError, dropping the id/status prefix', () => {
      const err = jobFailedError();
      const { reason, jobHref } = jobFailure(err, 'did:key:venue123');

      expect((reason as Error).message).toBe(
        "Cannot resume agent 'x': status is SLEEPING; agent:resume requires SUSPENDED",
      );
      expect(jobHref).toBe(
        '/venues/did%3Akey%3Avenue123/jobs/0x019fd5dae9aa0000ea26d3ef7c4509f6',
      );
    });

    it('omits jobHref when no venueId is available', () => {
      const { jobHref } = jobFailure(jobFailedError(), undefined);
      expect(jobHref).toBeUndefined();
    });

    it('unwraps a pre-cleaned Error carrying the original JobFailedError as cause (lib/hitl.ts pattern)', () => {
      const original = jobFailedError({ error: 'An echoed grant was never offered' });
      const wrapped = new Error('An echoed grant was never offered', { cause: original });

      const { reason, jobHref } = jobFailure(wrapped, 'did:key:venue123');

      expect(reason).toBe(wrapped); // reused as-is, not re-derived
      expect(jobHref).toBe(
        '/venues/did%3Akey%3Avenue123/jobs/0x019fd5dae9aa0000ea26d3ef7c4509f6',
      );
    });

    it('passes non-job errors through unchanged with no jobHref', () => {
      const err = new TypeError('Failed to fetch');
      const { reason, jobHref } = jobFailure(err, 'did:key:venue123');

      expect(reason).toBe(err);
      expect(jobHref).toBeUndefined();
    });
  });

  describe('notifyError with jobHref', () => {
    it('truncates a long reason to a preview and offers a "View job" action', () => {
      const longReason = 'A'.repeat(200);
      notifyError('Unable to send message', new Error(longReason), undefined, '/venues/v/jobs/j1');

      const [, opts] = mockSonner.error.mock.calls[0];
      expect(opts.description).toHaveLength(81); // 80 chars + ellipsis
      expect(opts.description.startsWith('A'.repeat(80))).toBe(true);
      expect(opts.action.label).toBe('View job');
    });

    it('still offers Copy (in the cancel slot) carrying the untruncated text', () => {
      Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
      const longReason = 'B'.repeat(200);
      notifyError('Unable to send message', new Error(longReason), undefined, '/venues/v/jobs/j1');

      const [, opts] = mockSonner.error.mock.calls[0];
      opts.cancel.onClick();
      const copied = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
      expect(copied).toContain(longReason); // full text, not the preview
    });

    it('does not truncate short reasons even with a jobHref', () => {
      notifyError('Unable to send message', new Error('short'), undefined, '/venues/v/jobs/j1');

      const [, opts] = mockSonner.error.mock.calls[0];
      expect(opts.description).toBe('short');
    });
  });
});
