/**
 * Consent storage — the gate every analytics vendor sits behind (D070 §5.1).
 */
import {
  CONSENT_KEY,
  PRIVACY_POLICY_VERSION,
  hasConsent,
  isDoNotTrackEnabled,
  readConsent,
  writeConsent,
} from '@/lib/consent';

function clearAllStorage() {
  localStorage.clear();
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0];
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

describe('consent storage', () => {
  beforeEach(clearAllStorage);

  it('treats no stored record as consent to nothing beyond essential', () => {
    expect(readConsent()).toBeNull();
    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('marketing')).toBe(false);
    expect(hasConsent('essential')).toBe(true);
  });

  it('persists a decision to both localStorage and a cookie', () => {
    writeConsent({ essential: true, analytics: true, marketing: false });

    expect(hasConsent('analytics')).toBe(true);
    expect(hasConsent('marketing')).toBe(false);
    expect(localStorage.getItem(CONSENT_KEY)).toContain('"analytics":true');
    expect(document.cookie).toContain(CONSENT_KEY);
  });

  it('dispatches covia-consent-change so listeners react in the same tab', () => {
    const listener = jest.fn();
    window.addEventListener('covia-consent-change', listener);
    writeConsent({ essential: true, analytics: true, marketing: true });
    window.removeEventListener('covia-consent-change', listener);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('re-prompts when the record was given against an older privacy policy', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        categories: { essential: true, analytics: true, marketing: true },
        version: '1999-01-01',
        givenAt: new Date().toISOString(),
      }),
    );

    expect(readConsent()).toBeNull();
    expect(hasConsent('analytics')).toBe(false);
  });

  it('ignores a malformed record rather than trusting it', () => {
    localStorage.setItem(CONSENT_KEY, '{not json');
    expect(readConsent()).toBeNull();
  });

  it('falls back to the cookie when localStorage holds nothing', () => {
    const record = JSON.stringify({
      categories: { essential: true, analytics: true, marketing: false },
      version: PRIVACY_POLICY_VERSION,
      givenAt: new Date().toISOString(),
    });
    document.cookie = `${CONSENT_KEY}=${encodeURIComponent(record)}; path=/`;

    expect(hasConsent('analytics')).toBe(true);
  });

  describe('migration from the previous binary banner', () => {
    it('carries an Accept All decision forward without re-asking', () => {
      document.cookie = 'yourAppCookieConsent=true; path=/';

      const migrated = readConsent();
      expect(migrated?.categories).toEqual({
        essential: true,
        analytics: true,
        marketing: true,
      });
      expect(migrated?.version).toBe(PRIVACY_POLICY_VERSION);
      // The legacy cookie is cleared so the migration runs exactly once.
      expect(document.cookie).not.toContain('yourAppCookieConsent=true');
    });

    it('carries a Decline decision forward as a refusal', () => {
      document.cookie = 'yourAppCookieConsent=false; path=/';

      expect(readConsent()?.categories).toEqual({
        essential: true,
        analytics: false,
        marketing: false,
      });
      expect(hasConsent('analytics')).toBe(false);
    });

    it('does not invent a decision from an unrecognised legacy value', () => {
      document.cookie = 'yourAppCookieConsent=maybe; path=/';
      expect(readConsent()).toBeNull();
    });
  });

  describe('do not track', () => {
    afterEach(() => {
      Object.defineProperty(window.navigator, 'doNotTrack', {
        value: undefined,
        configurable: true,
      });
    });

    it('is off by default', () => {
      expect(isDoNotTrackEnabled()).toBe(false);
    });

    it.each(['1', 'yes'])('detects navigator.doNotTrack = %s', (signal) => {
      Object.defineProperty(window.navigator, 'doNotTrack', {
        value: signal,
        configurable: true,
      });
      expect(isDoNotTrackEnabled()).toBe(true);
    });
  });
});
