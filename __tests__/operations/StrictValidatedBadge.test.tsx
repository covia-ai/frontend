import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StrictValidatedBadge } from '@/components/typed-result/StrictValidatedBadge';

jest.mock('json-edit-react', () => ({
  JsonEditor: (props: any) => <div data-testid="json-editor">{JSON.stringify(props.data)}</div>,
  githubDarkTheme: { name: 'dark' },
  githubLightTheme: { name: 'light' },
}));
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('StrictValidatedBadge', () => {
  it('opens a dialog showing the schema on click', async () => {
    const user = userEvent.setup();
    const schema = { type: 'object', properties: { a: { type: 'string' } } };
    render(<StrictValidatedBadge schema={schema} />);

    expect(screen.queryByText('Response Schema')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('strict-validated-badge'));

    expect(screen.getByText('Response Schema')).toBeInTheDocument();
    expect(screen.getByTestId('json-editor')).toHaveTextContent(JSON.stringify(schema));
  });
});
