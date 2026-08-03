import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemedJsonEditor } from '@/components/ThemedJsonEditor';

// covia-ai/frontend#202: MetadataViewer's "View metadata" dialog used
// JsonEditor with no theme prop at all, unlike JSONViewer's content-preview
// dialog — the actual theme-selection logic went untested because the
// existing MetadataViewer test mocked JsonEditor away entirely. Testing this
// dedicated component directly closes that gap. The theme objects are
// defined entirely inside the factory (not referencing an outer const) so
// there's no jest.mock hoisting/TDZ issue to work around.
jest.mock('json-edit-react', () => ({
  JsonEditor: (props: any) => (
    <div data-testid="json-editor">{props.theme?.name ?? 'none'}</div>
  ),
  githubDarkTheme: { name: 'dark' },
  githubLightTheme: { name: 'light' },
}));

let mockTheme = 'light';
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

describe('ThemedJsonEditor', () => {
  it('uses the dark theme when the app is in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-editor')).toHaveTextContent('dark');
  });

  it('uses the light theme otherwise', () => {
    mockTheme = 'light';
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-editor')).toHaveTextContent('light');
  });

  it('treats an unset/system theme as light, same as JSONViewer', () => {
    mockTheme = undefined as any;
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-editor')).toHaveTextContent('light');
  });
});
