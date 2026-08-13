import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyField } from '@/components/CopyField';

const writeText = jest.fn(() => Promise.resolve());
beforeAll(() => {
  Object.assign(navigator, { clipboard: { writeText } });
});
beforeEach(() => writeText.mockClear());

describe('CopyField', () => {
  it('copies the value, not the label', async () => {
    render(<CopyField label="Venue URL" value="https://venue-3.covia.ai" />);
    // The copy control is labelled by, and sits beside, the value it copies.
    await userEvent.click(screen.getByRole('button', { name: 'Copy Venue URL' }));
    expect(writeText).toHaveBeenCalledWith('https://venue-3.covia.ai');
  });

  it('shows the value', () => {
    render(<CopyField label="Venue DID" value="did:key:zABC" />);
    expect(screen.getByText('did:key:zABC')).toBeInTheDocument();
  });

  it('renders the value as an external link when href is set', () => {
    render(<CopyField label="Venue URL" value="https://v.test" href="https://v.test" />);
    const link = screen.getByRole('link', { name: 'https://v.test' });
    expect(link).toHaveAttribute('href', 'https://v.test');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
