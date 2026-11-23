import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { OperationSignature } from '@/components/operation-display';

// The signature must agree with what the Run tab actually asks for.
// OperationInputForm renders a single top-level editor for any schema without
// `properties`, so a schema like `{ type: "string" }` is one unnamed field —
// not an absent one.
describe('OperationSignature', () => {
  it('renders a chip per named property, marking required ones', () => {
    render(
      <OperationSignature
        operation={{
          input: {
            properties: { prompt: { type: 'string' }, seed: { type: 'integer' } },
            required: ['prompt'],
          },
          output: { properties: { text: { type: 'string' } } },
        }}
      />,
    );

    expect(screen.getByText('prompt')).toBeInTheDocument();
    expect(screen.getByText('seed')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
    expect(screen.getByText('int')).toBeInTheDocument();
    // One asterisk: `prompt` is required, `seed` and the output are not.
    expect(screen.getAllByText('*')).toHaveLength(1);
  });

  it('renders a top-level schema as a single typed chip, not as no fields', () => {
    render(<OperationSignature operation={{ input: { type: 'string' }, output: { type: 'object' } }} />);

    expect(screen.getByTestId('operation-signature')).toBeInTheDocument();
    expect(screen.getByText('str')).toBeInTheDocument();
    expect(screen.getByText('obj')).toBeInTheDocument();
    // The placeholder dash is what an absent side renders; neither side is absent.
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('falls back to "any" for a top-level schema with no declared type', () => {
    render(<OperationSignature operation={{ input: {} }} />);

    expect(screen.getByText('any')).toBeInTheDocument();
  });

  it('renders a dash for the side that declares no schema', () => {
    render(<OperationSignature operation={{ input: { properties: { a: { type: 'string' } } } }} />);

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('returns null when the operation declares neither input nor output', () => {
    const { container } = render(<OperationSignature operation={{}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('caps chips at `max` and counts the remainder', () => {
    render(
      <OperationSignature
        max={2}
        operation={{
          input: {
            properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
          },
        }}
      />,
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.queryByText('c')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
