import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TypedResultRenderer } from '@/components/typed-result/TypedResultRenderer';

jest.mock('json-edit-react', () => ({
  JsonEditor: (props: any) => <div data-testid="json-editor">{JSON.stringify(props.data)}</div>,
  githubDarkTheme: { name: 'dark' },
  githubLightTheme: { name: 'light' },
}));
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const TABLE_SCHEMA = { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } } };
const CARD_SCHEMA = { type: 'object', properties: { name: { type: 'string' } } };

describe('TypedResultRenderer', () => {
  it('renders a table for an array-of-objects schema', () => {
    render(<TypedResultRenderer value={[{ name: 'Ada' }]} schema={TABLE_SCHEMA} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('renders a key-value card for a flat-object schema', () => {
    render(<TypedResultRenderer value={{ name: 'Ada' }} schema={CARD_SCHEMA} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('falls back to the JSON viewer for an unrecognized shape', async () => {
    render(<TypedResultRenderer value={{ name: 'Ada' }} schema={{ type: 'string' }} />);
    expect(await screen.findByTestId('json-editor')).toBeInTheDocument();
  });

  it('falls back to the JSON viewer when the value does not match the classified shape', async () => {
    // Schema says array-of-objects but the actual value is a string — degrade
    // gracefully instead of crashing on Array.isArray/object-shape mismatch.
    render(<TypedResultRenderer value="not an array" schema={TABLE_SCHEMA} />);
    expect(await screen.findByTestId('json-editor')).toBeInTheDocument();
  });

  it('shows the strict-validated badge only when strict is true and the shape is known', () => {
    const { rerender } = render(<TypedResultRenderer value={{ name: 'Ada' }} schema={CARD_SCHEMA} strict />);
    expect(screen.getByTestId('strict-validated-badge')).toBeInTheDocument();

    rerender(<TypedResultRenderer value={{ name: 'Ada' }} schema={CARD_SCHEMA} strict={false} />);
    expect(screen.queryByTestId('strict-validated-badge')).not.toBeInTheDocument();

    rerender(<TypedResultRenderer value={{ name: 'Ada' }} schema={{ type: 'string' }} strict />);
    expect(screen.queryByTestId('strict-validated-badge')).not.toBeInTheDocument();
  });
});
