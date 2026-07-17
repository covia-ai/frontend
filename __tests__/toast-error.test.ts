import '@testing-library/jest-dom';

const mockToastError = jest.fn();
jest.mock('sonner', () => ({
  toast: { error: (...args: any[]) => mockToastError(...args) },
}));

import { toastError } from '@/lib/toast-error';

describe('toastError', () => {
  beforeEach(() => mockToastError.mockReset());

  it('names the unreachable target on bare network failures', () => {
    toastError('Unable to store secret', new TypeError('Failed to fetch'), 'http://localhost:8080');

    const [, opts] = mockToastError.mock.calls[0];
    // The target URL must be in the detail — "Failed to fetch" alone is useless.
    expect(opts.description).toContain('http://localhost:8080');
    expect(opts.description).toContain('Failed to fetch');
  });

  it('passes server error messages through unchanged', () => {
    toastError('Unable to store secret', new Error('HTTP 401: Request failed with status 401'), 'http://localhost:8080');

    const [, opts] = mockToastError.mock.calls[0];
    expect(opts.description).toBe('HTTP 401: Request failed with status 401');
  });

  it('offers a copy action carrying the full detail', () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
    toastError('Oops', new TypeError('Failed to fetch'), 'http://x');

    const [, opts] = mockToastError.mock.calls[0];
    opts.action.onClick();
    const copied = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(copied).toContain('Oops');
    expect(copied).toContain('http://x');
  });
});
