import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StrictValidatedBadge } from '@/components/typed-result/StrictValidatedBadge';

// Read-only display goes through json-edit-react 2's JsonViewer.
jest.mock('json-edit-react', () => ({
  JsonViewer: (props: any) => <div data-testid="json-viewer">{JSON.stringify(props.data)}</div>,
}));
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

describe('StrictValidatedBadge', () => {
  it('opens a dialog showing the schema on click', async () => {
    const user = userEvent.setup();
    const schema = { type: 'object', properties: { a: { type: 'string' } } };
    render(<StrictValidatedBadge schema={schema} />);

    expect(screen.queryByText('Response Schema')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('strict-validated-badge'));

    expect(screen.getByText('Response Schema')).toBeInTheDocument();
    expect(screen.getByTestId('json-viewer')).toHaveTextContent(JSON.stringify(schema));
  });
});
