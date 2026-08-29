import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookieConsentComponent } from '@/components/CookieConsent';
import {
  CONSENT_KEY,
  PRIVACY_POLICY_VERSION,
  hasConsent,
  openConsentPreferences,
} from '@/lib/consent';

function clearAllStorage() {
  localStorage.clear();
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0];
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

describe('CookieConsentComponent', () => {
  beforeEach(clearAllStorage);

  it('asks on a first visit', async () => {
    render(<CookieConsentComponent />);
    expect(await screen.findByRole('dialog', { name: 'Cookie consent' })).toBeInTheDocument();
  });

  it('stays out of the way once a decision exists', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        categories: { essential: true, analytics: true, marketing: false },
        version: PRIVACY_POLICY_VERSION,
        givenAt: new Date().toISOString(),
      }),
    );
    render(<CookieConsentComponent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('grants every category on Accept All', async () => {
    const user = userEvent.setup();
    render(<CookieConsentComponent />);

    await user.click(await screen.findByRole('button', { name: 'Accept All' }));

    expect(hasConsent('analytics')).toBe(true);
    expect(hasConsent('marketing')).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses the optional categories on Reject Non-Essential', async () => {
    const user = userEvent.setup();
    render(<CookieConsentComponent />);

    await user.click(
      await screen.findByRole('button', { name: 'Reject Non-Essential' }),
    );

    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('saves a per-category choice made in the drawer', async () => {
    const user = userEvent.setup();
    render(<CookieConsentComponent />);

    await user.click(await screen.findByRole('button', { name: 'Customise' }));
    await user.click(screen.getByRole('checkbox', { name: 'Toggle Analytics' }));
    await user.click(screen.getByRole('button', { name: 'Save Preferences' }));

    expect(hasConsent('analytics')).toBe(true);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('will not let the essential category be switched off', async () => {
    const user = userEvent.setup();
    render(<CookieConsentComponent />);

    await user.click(await screen.findByRole('button', { name: 'Customise' }));

    expect(screen.getByRole('checkbox', { name: 'Toggle Essential' })).toBeDisabled();
  });

  it('reopens for a user who wants to change their mind', async () => {
    const user = userEvent.setup();
    render(<CookieConsentComponent />);
    await user.click(await screen.findByRole('button', { name: 'Accept All' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => openConsentPreferences());

    const drawer = await screen.findByRole('dialog', {
      name: 'Cookie preferences',
    });
    expect(drawer).toBeInTheDocument();
    // The drawer reflects the decision already stored, not the defaults.
    expect(screen.getByRole('checkbox', { name: 'Toggle Analytics' })).toBeChecked();
  });

  it('lets a granted decision be withdrawn from the drawer', async () => {
    const user = userEvent.setup();
    render(<CookieConsentComponent />);
    await user.click(await screen.findByRole('button', { name: 'Accept All' }));

    act(() => openConsentPreferences());
    await screen.findByRole('dialog', { name: 'Cookie preferences' });
    await user.click(
      screen.getByRole('button', { name: 'Reject Non-Essential' }),
    );

    expect(hasConsent('analytics')).toBe(false);
  });
});
