import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { CookieConsentComponent } from '@/components/CookieConsent';
import {
  CONSENT_KEY,
  CONSENT_STORED_ATTRIBUTE,
  PRIVACY_POLICY_VERSION,
  consentPrepaintScript,
} from '@/lib/consent';

// frontend#474: the banner is in the server HTML so a first visit sees it at
// first paint; an inline script marks <html> when a decision is stored so CSS
// hides it for returning visitors until React takes over.

function clearAllStorage() {
  localStorage.clear();
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0];
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
  document.documentElement.removeAttribute(CONSENT_STORED_ATTRIBUTE);
}

const record = (version = PRIVACY_POLICY_VERSION) =>
  JSON.stringify({
    categories: { essential: true, analytics: false, marketing: false },
    version,
    givenAt: new Date().toISOString(),
  });

// The script is inline in <head>; run it the same way.
const runScript = () => new Function(consentPrepaintScript())();
const marked = () => document.documentElement.hasAttribute(CONSENT_STORED_ATTRIBUTE);

describe('consent pre-paint script', () => {
  beforeEach(clearAllStorage);

  it('marks <html> when a current decision is in localStorage', () => {
    localStorage.setItem(CONSENT_KEY, record());
    runScript();
    expect(marked()).toBe(true);
  });

  it('falls back to the cookie, as readConsent does', () => {
    document.cookie = `${CONSENT_KEY}=${encodeURIComponent(record())}; path=/`;
    runScript();
    expect(marked()).toBe(true);
  });

  it('leaves the banner showing on a first visit', () => {
    runScript();
    expect(marked()).toBe(false);
  });

  it('leaves the banner showing for a decision under an older policy', () => {
    localStorage.setItem(CONSENT_KEY, record('2020-01-01'));
    runScript();
    expect(marked()).toBe(false);
  });

  it('ignores a malformed record without throwing', () => {
    localStorage.setItem(CONSENT_KEY, '{not json');
    expect(runScript).not.toThrow();
    expect(marked()).toBe(false);
  });
});

describe('CookieConsentComponent and the pre-paint marker', () => {
  beforeEach(clearAllStorage);

  it('renders the banner in the server HTML', () => {
    expect(renderToString(<CookieConsentComponent />)).toContain('id="cookie_consent"');
  });

  it('removes the marker once it has read the stored decision', () => {
    localStorage.setItem(CONSENT_KEY, record());
    runScript();
    expect(marked()).toBe(true);
    render(<CookieConsentComponent />);
    expect(marked()).toBe(false);
  });
});
