import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DocumentViewer } from '@/components/DocumentViewer';

jest.mock('@cyntler/react-doc-viewer', () => ({
  __esModule: true,
  default: () => <div data-testid="doc-viewer">DocViewer</div>,
  DocViewerRenderers: [{ fileTypes: ['txt', 'text/plain'] }, { fileTypes: ['csv'] }],
  TXTRenderer: { fileTypes: ['txt', 'text/plain'] },
}));

jest.mock('@/hooks/use-asset-text-content', () => ({
  useRemoteTextContent: jest.fn(() => ({ text: 'hello world', loading: false, error: null })),
}));

describe('DocumentViewer', () => {
  // covia-ai/frontend follow-up: text/plain's TXTRenderer is excluded for an
  // unpatched XSS, so DocViewer never has a renderer for it — the Preview
  // tab used to always show the library's own generic "No renderer for file
  // type: txt" fallback instead of anything from this app.
  test('skips the Preview/Raw tabs and DocViewer entirely for plain text', async () => {
    const user = userEvent.setup();
    render(<DocumentViewer contentUrl="https://venue.test/content" contentType="text/plain" />);
    await user.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-viewer')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Preview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Raw' })).not.toBeInTheDocument();
  });

  test('still offers Preview/Raw tabs for a type with a real renderer (csv)', async () => {
    const user = userEvent.setup();
    render(<DocumentViewer contentUrl="https://venue.test/content" contentType="text/csv" />);
    await user.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Raw' })).toBeInTheDocument();
    expect(screen.getByTestId('doc-viewer')).toBeInTheDocument();
  });

  test('renders DocViewer alone (no tabs) for a type with no raw form, e.g. an image', async () => {
    const user = userEvent.setup();
    render(<DocumentViewer contentUrl="https://venue.test/content" contentType="image/png" />);
    await user.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByTestId('doc-viewer')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Preview' })).not.toBeInTheDocument();
  });

  test('renders nothing for a content type with no known file type mapping', () => {
    const { container } = render(
      <DocumentViewer contentUrl="https://venue.test/content" contentType="application/x-unknown" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
