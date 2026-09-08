import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CreateAssetComponent } from '@/components/CreateAssetComponent';
import { notifyError } from '@/lib/notify';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('json-edit-react', () => ({
  JsonEditor: () => <div data-testid="json-editor" />,
}));

jest.mock('@/lib/notify', () => ({
  notifyError: jest.fn(),
}));

describe('CreateAssetComponent', () => {
  beforeEach(() => {
    pushMock.mockClear();
    (notifyError as jest.Mock).mockClear();
    // jsdom's File/Blob polyfill has neither SubtleCrypto nor
    // Blob.arrayBuffer() — uploadContent() needs both to hash the file
    // before advancing past step 1.
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { subtle: { digest: jest.fn().mockResolvedValue(new Uint8Array(32).buffer) } },
    });
    if (!File.prototype.arrayBuffer) {
      File.prototype.arrayBuffer = function (this: File) {
        return Promise.resolve(new ArrayBuffer(8));
      };
    }
  });

  // covia-ai/frontend follow-up: creating an asset used to just notify the
  // parent list to refetch in place, leaving the user on /assets — now it
  // should take them straight to the asset it just created.
  it("navigates to the new asset's own page instead of staying on the list", async () => {
    const user = userEvent.setup();
    const putContent = jest.fn().mockResolvedValue(undefined);
    const register = jest.fn().mockResolvedValue({ id: 'abc123', putContent });
    const venue = {
      venueId: 'did:web:venue-test.covia.ai',
      assets: { register },
    } as any;

    render(<CreateAssetComponent venue={venue} />);

    await user.click(screen.getByTestId('create-asset-trigger'));

    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'upload' }));

    await user.click(await screen.findByRole('button', { name: 'create asset' }));

    expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: 'test.txt' }));
    expect(putContent).toHaveBeenCalledWith(file);
    expect(pushMock).toHaveBeenCalledWith(
      `/venues/${encodeURIComponent('did:web:venue-test.covia.ai')}/assets/abc123`,
    );
  });

  it('keeps the dialog open when asset creation fails', async () => {
    const user = userEvent.setup();
    const venue = {
      venueId: 'did:web:venue-test.covia.ai',
      baseUrl: 'https://venue-test.covia.ai',
      assets: { register: jest.fn().mockRejectedValue(new Error('registration failed')) },
    } as any;

    render(<CreateAssetComponent venue={venue} />);
    await user.click(screen.getByTestId('create-asset-trigger'));
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: 'upload' }));
    await user.click(await screen.findByRole('button', { name: 'create asset' }));

    expect(await screen.findByRole('button', { name: 'create asset' })).toBeInTheDocument();
    expect(notifyError).toHaveBeenCalledWith(
      'Unable to create asset',
      expect.any(Error),
      'https://venue-test.covia.ai',
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rejects a disallowed file extension picked via the manual file input', async () => {
    // The native `accept` attribute already filters the OS picker, so this
    // exercises the "All Files" bypass the JS-level check exists for.
    const user = userEvent.setup({ applyAccept: false });
    const venue = {
      venueId: 'did:web:venue-test.covia.ai',
      assets: { register: jest.fn() },
    } as any;

    render(<CreateAssetComponent venue={venue} />);
    await user.click(screen.getByTestId('create-asset-trigger'));
    const file = new File(['#!/bin/sh'], 'script.sh', { type: 'application/x-sh' });
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    expect(notifyError).toHaveBeenCalledWith(
      'Unsupported file type',
      '"script.sh" isn\'t an accepted file type for assets.',
    );
    // Never advanced past step 1 — no "upload" click needed to prove
    // rejection, since the metadata form only exists after step 1.
    expect(screen.queryByRole('button', { name: 'create asset' })).not.toBeInTheDocument();
  });

  it('rejects an oversized file picked via the manual file input', async () => {
    const user = userEvent.setup();
    const venue = {
      venueId: 'did:web:venue-test.covia.ai',
      assets: { register: jest.fn() },
    } as any;

    render(<CreateAssetComponent venue={venue} />);
    await user.click(screen.getByTestId('create-asset-trigger'));
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 });
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    expect(notifyError).toHaveBeenCalledWith(
      'File too large',
      '"big.pdf" is over the 25MB upload limit.',
    );
  });

  it('fast path (initialFile) skips straight to a one-click register screen', async () => {
    const user = userEvent.setup();
    const putContent = jest.fn().mockResolvedValue(undefined);
    const register = jest.fn().mockResolvedValue({ id: 'dropped123', putContent });
    const venue = {
      venueId: 'did:web:venue-test.covia.ai',
      assets: { register },
    } as any;
    const onOpenChange = jest.fn();
    const file = new File(['hello world'], 'dropped.pdf', { type: 'application/pdf' });

    render(<CreateAssetComponent venue={venue} open onOpenChange={onOpenChange} initialFile={file} />);

    // No trigger button in controlled mode, and the manual type-choice
    // screen never shows for a fast-path instance.
    expect(screen.queryByTestId('create-asset-trigger')).not.toBeInTheDocument();
    expect(screen.getByText('Register as Asset')).toBeInTheDocument();
    expect(screen.getByText('dropped.pdf')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'register asset' }));

    expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: 'dropped.pdf' }));
    expect(putContent).toHaveBeenCalledWith(file);
    expect(pushMock).toHaveBeenCalledWith(
      `/venues/${encodeURIComponent('did:web:venue-test.covia.ai')}/assets/dropped123`,
    );
  });

  it('fast path "Edit details" reaches the full metadata form', async () => {
    const user = userEvent.setup();
    const venue = {
      venueId: 'did:web:venue-test.covia.ai',
      assets: { register: jest.fn() },
    } as any;
    const file = new File(['hello world'], 'dropped.md', { type: 'text/markdown' });

    render(<CreateAssetComponent venue={venue} open onOpenChange={jest.fn()} initialFile={file} />);
    await user.click(await screen.findByRole('button', { name: 'edit details' }));

    expect(screen.getByText('Provide Metadata')).toBeInTheDocument();
  });
});
