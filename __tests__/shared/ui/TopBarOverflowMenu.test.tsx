import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSetTheme = jest.fn();
let mockResolvedTheme: string | undefined = 'light';
jest.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: mockSetTheme, resolvedTheme: mockResolvedTheme }),
}));

let mockAccessState = 'public';
jest.mock('@/hooks/use-venue-access', () => ({
  useVenueAccess: () => ({ state: mockAccessState }),
}));
jest.mock('@/hooks/use-venues', () => ({
  useVenues: (selector: (state: unknown) => unknown) =>
    selector({
      selectedVenueId: 'venue-1',
      venues: [{ venueId: 'venue-1', baseUrl: 'https://venue.example' }],
    }),
}));

import { TopBarOverflowMenu } from '@/components/admin-panel/TopBarOverflowMenu';

// Below sm the topbar sheds controls to keep the breadcrumb readable. It may
// only shed them into this menu — these assertions are the guard that nothing
// becomes unreachable on a phone.
describe('TopBarOverflowMenu', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockResolvedTheme = 'light';
    mockAccessState = 'public';
  });

  // Radix pins pointer-events on the body while a menu is open, so a second
  // tree can never be clicked alongside the first: each case that renders
  // twice unmounts in between.
  async function open(props: { docsHref?: string } = { docsHref: 'https://docs.covia.ai/x' }) {
    const user = userEvent.setup();
    const view = render(<TopBarOverflowMenu {...props} venueId="venue-1" />);
    await user.click(screen.getByTestId('topbar-overflow-trigger'));
    return { user, unmount: view.unmount };
  }

  it('carries the docs link, the theme toggle and the access state', async () => {
    await open();

    // asChild, so the row *is* the anchor rather than wrapping one.
    const docs = await screen.findByTestId('topbar-overflow-docs');
    expect(docs).toHaveTextContent('View documentation');
    expect(docs).toHaveAttribute('href', 'https://docs.covia.ai/x');
    expect(docs).toHaveAttribute('target', '_blank');
    expect(docs).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getByTestId('topbar-overflow-theme')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-overflow-access')).toHaveTextContent('Public');
  });

  it('switches a light page to dark, and a dark page to light', async () => {
    const light = await open();
    await light.user.click(await screen.findByTestId('topbar-overflow-theme'));
    expect(mockSetTheme).toHaveBeenLastCalledWith('dark');
    light.unmount();

    mockResolvedTheme = 'dark';
    const dark = await open();
    await dark.user.click(await screen.findByTestId('topbar-overflow-theme'));
    expect(mockSetTheme).toHaveBeenLastCalledWith('light');
  });

  // Same contract as DarkLightToggle: the server can't know the theme, so
  // markup that varied with it could never hydrate. CSS on the <html> theme
  // class picks which label shows.
  it('renders the same theme row whatever the theme', async () => {
    mockResolvedTheme = 'light';
    const lightView = await open();
    const light = (await screen.findByTestId('topbar-overflow-theme')).innerHTML;
    lightView.unmount();

    mockResolvedTheme = 'dark';
    await open();
    const dark = (await screen.findByTestId('topbar-overflow-theme')).innerHTML;

    expect(dark).toBe(light);
  });

  it('omits the docs row on a route with no documentation', async () => {
    await open({});
    expect(await screen.findByTestId('topbar-overflow-theme')).toBeInTheDocument();
    expect(screen.queryByTestId('topbar-overflow-docs')).not.toBeInTheDocument();
  });

  it('states when the venue requires signing in', async () => {
    mockAccessState = 'signed-out';
    await open();
    expect(await screen.findByTestId('topbar-overflow-access')).toHaveTextContent(
      'Sign-in required',
    );
  });

  it('says nothing about access once the account is connected', async () => {
    mockAccessState = 'connected';
    await open();
    expect(await screen.findByTestId('topbar-overflow-theme')).toBeInTheDocument();
    expect(screen.queryByTestId('topbar-overflow-access')).not.toBeInTheDocument();
  });
});
