import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useGlobalFileDrop, useGlobalFileDropListener, useGlobalFileDropStore } from '@/hooks/use-global-file-drop';
import { notifyError } from '@/lib/notify';

jest.mock('@/lib/notify', () => ({
  notifyError: jest.fn(),
}));

function TestHarness() {
  useGlobalFileDropListener();
  const { isDragging, droppedFile } = useGlobalFileDrop();
  return (
    <div>
      <span data-testid="dragging">{String(isDragging)}</span>
      <span data-testid="dropped">{droppedFile?.name ?? 'none'}</span>
    </div>
  );
}

// jsdom's DragEvent doesn't carry a real DataTransfer, so a plain Event with
// dataTransfer attached manually stands in — the handlers only read
// `.types` and `.files` off it, both of which this satisfies.
function fileDragEvent(type: string, files: File[] = []): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files },
  });
  return event;
}

describe('useGlobalFileDropListener / useGlobalFileDrop', () => {
  beforeEach(() => {
    (notifyError as jest.Mock).mockClear();
    // The store is a module-level singleton — reset between tests, same as
    // this repo's other persisted/shared stores would need in isolation.
    useGlobalFileDropStore.setState({ isDragging: false, droppedFile: null, dropId: 0 });
  });

  it('tracks drag-enter/leave as isDragging', () => {
    render(<TestHarness />);
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');

    act(() => { window.dispatchEvent(fileDragEvent('dragenter')); });
    expect(screen.getByTestId('dragging')).toHaveTextContent('true');

    act(() => { window.dispatchEvent(fileDragEvent('dragleave')); });
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');
  });

  it('accepts a valid dropped file', () => {
    render(<TestHarness />);
    const file = new File(['hello'], 'notes.md', { type: 'text/markdown' });

    act(() => { window.dispatchEvent(fileDragEvent('drop', [file])); });

    expect(screen.getByTestId('dropped')).toHaveTextContent('notes.md');
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('rejects a disallowed file extension without setting droppedFile', () => {
    render(<TestHarness />);
    const file = new File(['#!/bin/sh'], 'script.sh', { type: 'application/x-sh' });

    act(() => { window.dispatchEvent(fileDragEvent('drop', [file])); });

    expect(screen.getByTestId('dropped')).toHaveTextContent('none');
    expect(notifyError).toHaveBeenCalledWith(
      'Unsupported file type',
      '"script.sh" isn\'t an accepted file type for assets.',
    );
  });

  it('rejects an oversized file without setting droppedFile', () => {
    render(<TestHarness />);
    const file = new File(['x'], 'big.zip', { type: 'application/zip' });
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 });

    act(() => { window.dispatchEvent(fileDragEvent('drop', [file])); });

    expect(screen.getByTestId('dropped')).toHaveTextContent('none');
    expect(notifyError).toHaveBeenCalledWith(
      'File too large',
      '"big.zip" is over the 25MB upload limit.',
    );
  });
});
