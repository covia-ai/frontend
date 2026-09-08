import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TypedResultTable } from '@/components/typed-result/TypedResultTable';

const SCHEMA = {
  type: 'array',
  items: { type: 'object', properties: { name: { type: 'string' }, score: { type: 'number' } } },
};

const ROWS = [
  { name: 'Bravo', score: 2 },
  { name: 'Alpha', score: 5 },
  { name: 'Charlie', score: 1 },
];

describe('TypedResultTable', () => {
  it('renders one column per schema property, in schema order', () => {
    render(<TypedResultTable value={ROWS} schema={SCHEMA} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers[0]).toContain('Name');
    expect(headers[1]).toContain('Score');
  });

  it('renders every row', () => {
    render(<TypedResultTable value={ROWS} schema={SCHEMA} />);
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('sorts ascending then descending on repeated header clicks', async () => {
    const user = userEvent.setup();
    render(<TypedResultTable value={ROWS} schema={SCHEMA} />);

    const cellOrder = () => screen.getAllByRole('cell').filter((_, i) => i % 2 === 0).map((c) => c.textContent);

    await user.click(screen.getByRole('button', { name: /name/i }));
    expect(cellOrder()).toEqual(['Alpha', 'Bravo', 'Charlie']);

    await user.click(screen.getByRole('button', { name: /name/i }));
    expect(cellOrder()).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('shows "No rows" when there are no columns to render', () => {
    render(<TypedResultTable value={[]} schema={{ type: 'array', items: { type: 'object' } }} />);
    expect(screen.getByText('No rows')).toBeInTheDocument();
  });
});
