import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CreateAssetComponent } from '@/components/CreateAssetComponent';

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
});
