import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemedJsonEditor } from '@/components/ThemedJsonEditor';

// covia-ai/frontend#202: MetadataViewer's "View metadata" dialog used
// JsonEditor with no theme prop at all, unlike JSONViewer's content-preview
// dialog — the actual theme-selection logic went untested because the
// existing MetadataViewer test mocked JsonEditor away entirely. Testing this
// dedicated component directly closes that gap.
//
// json-edit-react 2 has two entry points: the strictly controlled JsonEditor
// (setData required) and the read-only JsonViewer. Which one this component
// picks is part of what is under test, so each stand-in carries its own id.
// The theme prop is [baseTheme, inputOverride]; the stand-ins echo the base
// theme's name so the dark/light choice is observable.
jest.mock('json-edit-react', () => ({
  JsonEditor: (props: any) => (
    <div data-testid="json-editor" data-has-set-data={String(!!props.setData)}>
      {props.theme?.[0]?.name ?? 'none'}
    </div>
  ),
  JsonViewer: (props: any) => (
    <div data-testid="json-viewer">{props.theme?.[0]?.name ?? 'none'}</div>
  ),
}));
jest.mock('@json-edit-react/themes', () => ({
  githubDarkTheme: { name: 'dark' },
  githubLightTheme: { name: 'light' },
}));

let mockTheme = 'light';
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockTheme }),
}));

describe('ThemedJsonEditor', () => {
  it('uses the dark theme when the app is in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-viewer')).toHaveTextContent('dark');
  });

  it('uses the light theme otherwise', () => {
    mockTheme = 'light';
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-viewer')).toHaveTextContent('light');
  });

  it('treats a not-yet-resolved theme as light, same as JSONViewer', () => {
    mockTheme = undefined as any;
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-viewer')).toHaveTextContent('light');
  });

  // Workspace's value pane relies on this: read-only by default (metadata,
  // schema panels), but editable for the workspace explorer.
  it('is a read-only viewer by default', () => {
    render(<ThemedJsonEditor data={{ a: 1 }} />);
    expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('json-editor')).not.toBeInTheDocument();
  });

  it('becomes the controlled editor, with onChange as setData, when editable', () => {
    const onChange = jest.fn();
    render(<ThemedJsonEditor data={{ a: 1 }} editable onChange={onChange} />);
    const el = screen.getByTestId('json-editor');
    expect(el).toHaveAttribute('data-has-set-data', 'true');
    expect(el).toHaveTextContent('light');
    expect(screen.queryByTestId('json-viewer')).not.toBeInTheDocument();
  });

  // Editable without anywhere to send edits is not an editor.
  it('stays a viewer when editable but no onChange is given', () => {
    render(<ThemedJsonEditor data={{ a: 1 }} editable />);
    expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
  });
});
