/**
 * @jest-environment-options {"url": "https://app.covia.ai/operations"}
 */

/**
 * GA4 + PostHog instrumentation (D070 Phase 3). The behaviours worth pinning
 * are the ones that are hard to notice when they break: nothing may reach a
 * vendor before consent, and no payload may ever carry a credential.
 */

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
    startSessionRecording: jest.fn(),
    stopSessionRecording: jest.fn(),
  },
}));

import { webcrypto } from 'crypto';
import { CONSENT_KEY, PRIVACY_POLICY_VERSION } from '@/lib/consent';

// jsdom ships no WebCrypto; hashIdentity returns null without it.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

type Analytics = typeof import('@/lib/analytics');

function grantConsent(analytics = true) {
  localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({
      categories: { essential: true, analytics, marketing: false },
      // Anything other than the current version reads as stale, so take it
      // from the module rather than restating the date here.
      version: PRIVACY_POLICY_VERSION,
      givenAt: new Date().toISOString(),
    }),
  );
}

/**
 * The module keeps load state in closure variables, so each test gets a fresh
 * copy rather than inheriting whether a previous test had granted consent.
 */
function freshAnalytics(): Analytics {
  let mod!: Analytics;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/lib/analytics');
  });
  return mod;
}

describe('analytics', () => {
  let gtag: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '';
    gtag = jest.fn();
    window.gtag = gtag;
    window.dataLayer = [];
  });

  describe('credential stripping', () => {
    it('never records the auth callback path', () => {
      const { buildAnalyticsPath } = freshAnalytics();
      expect(
        buildAnalyticsPath('/auth/callback', 'token=secret&did=did%3Akey%3Aabc'),
      ).toBeNull();
    });

    it('removes credential-shaped parameters from other page views', () => {
      const { buildAnalyticsPath } = freshAnalytics();
      expect(
        buildAnalyticsPath('/operations', 'search=echo&token=secret&code=oauth-code'),
      ).toBe('/operations?search=echo');
    });

    it('preserves ordinary query parameters', () => {
      const { buildAnalyticsPath } = freshAnalytics();
      expect(buildAnalyticsPath('/jobs', 'status=STARTED&page=2')).toBe(
        '/jobs?status=STARTED&page=2',
      );
    });

    it('strips tokens out of an absolute URL', () => {
      const { sanitizeUrl } = freshAnalytics();
      expect(
        sanitizeUrl('https://app.covia.ai/jobs?page=2&access_token=abc'),
      ).toBe('https://app.covia.ai/jobs?page=2');
    });

    it('drops the whole query on the auth callback URL', () => {
      const { sanitizeUrl } = freshAnalytics();
      expect(
        sanitizeUrl('https://app.covia.ai/auth/callback?token=abc&did=xyz'),
      ).toBe('https://app.covia.ai/auth/callback');
    });

    it('leaves a non-URL value alone', () => {
      const { sanitizeUrl } = freshAnalytics();
      expect(sanitizeUrl(undefined)).toBeUndefined();
      expect(sanitizeUrl('not a url')).toBe('not a url');
    });
  });

  describe('hashIdentity', () => {
    it('produces a stable 16-character hex id', async () => {
      const { hashIdentity } = freshAnalytics();
      const did = 'did:key:z6MkabcDEF';

      const first = await hashIdentity(did);
      const second = await hashIdentity(did);

      expect(first).toBe(second);
      expect(first).toMatch(/^[0-9a-f]{16}$/);
    });

    it('gives different ids to different DIDs', async () => {
      const { hashIdentity } = freshAnalytics();
      expect(await hashIdentity('did:key:aaa')).not.toBe(
        await hashIdentity('did:key:bbb'),
      );
    });

    it('returns null for an empty value', async () => {
      const { hashIdentity } = freshAnalytics();
      expect(await hashIdentity('   ')).toBeNull();
    });
  });

  describe('consent gate', () => {
    it('sends nothing before a decision has been made', () => {
      const { initAnalytics, track } = freshAnalytics();
      initAnalytics();
      track('product_login', { method: 'keypair' });

      expect(gtag).not.toHaveBeenCalledWith(
        'event',
        'product_login',
        expect.anything(),
      );
      expect(document.head.querySelector('script')).toBeNull();
    });

    it('sends nothing when analytics consent is refused', () => {
      grantConsent(false);
      const { initAnalytics, track } = freshAnalytics();
      initAnalytics();
      track('product_login', { method: 'keypair' });

      expect(gtag).not.toHaveBeenCalledWith(
        'event',
        'product_login',
        expect.anything(),
      );
    });

    it('loads gtag and emits once consent is granted', () => {
      grantConsent(true);
      const { initAnalytics, track } = freshAnalytics();
      initAnalytics();
      track('product_login', { method: 'keypair' });

      expect(gtag).toHaveBeenCalledWith('event', 'product_login', {
        property: 'app.covia.ai',
        method: 'keypair',
      });
      const script = document.head.querySelector('script');
      expect(script?.getAttribute('src')).toContain('id=G-CS4QNLYT4M');
    });

    it('configures the cross-domain linker so client_id survives the hop', () => {
      grantConsent(true);
      const { initAnalytics, LINKER_DOMAINS } = freshAnalytics();
      initAnalytics();

      expect(gtag).toHaveBeenCalledWith(
        'config',
        'G-CS4QNLYT4M',
        expect.objectContaining({
          anonymize_ip: true,
          linker: { domains: LINKER_DOMAINS, accept_incoming: true },
        }),
      );
      expect(LINKER_DOMAINS).toEqual([
        'covia.ai',
        'docs.covia.ai',
        'app.covia.ai',
        'preview.covia.ai',
      ]);
    });

    it('re-grants storage through Consent Mode rather than reloading the tag', () => {
      grantConsent(true);
      const { initAnalytics } = freshAnalytics();
      initAnalytics();

      expect(gtag).toHaveBeenCalledWith(
        'consent',
        'update',
        expect.objectContaining({ analytics_storage: 'granted' }),
      );
    });

    it('denies storage again when consent is withdrawn', () => {
      grantConsent(true);
      const { initAnalytics } = freshAnalytics();
      initAnalytics();
      gtag.mockClear();

      grantConsent(false);
      window.dispatchEvent(new Event('covia-consent-change'));

      expect(gtag).toHaveBeenCalledWith(
        'consent',
        'update',
        expect.objectContaining({ analytics_storage: 'denied' }),
      );
    });

    it('stops emitting events after withdrawal', () => {
      grantConsent(true);
      const { initAnalytics, track } = freshAnalytics();
      initAnalytics();

      grantConsent(false);
      window.dispatchEvent(new Event('covia-consent-change'));
      gtag.mockClear();
      track('product_login', { method: 'keypair' });

      expect(gtag).not.toHaveBeenCalledWith(
        'event',
        'product_login',
        expect.anything(),
      );
    });
  });

  describe('do not track', () => {
    afterEach(() => {
      Object.defineProperty(window.navigator, 'doNotTrack', {
        value: undefined,
        configurable: true,
      });
    });

    it('loads nothing at all, even with consent granted', () => {
      Object.defineProperty(window.navigator, 'doNotTrack', {
        value: '1',
        configurable: true,
      });
      grantConsent(true);
      const { initAnalytics, track } = freshAnalytics();
      initAnalytics();
      track('product_login', { method: 'keypair' });

      expect(document.head.querySelector('script')).toBeNull();
      expect(gtag).not.toHaveBeenCalledWith(
        'event',
        'product_login',
        expect.anything(),
      );
    });
  });

  describe('trackLegacyAlias', () => {
    it('emits while the alias window is open', () => {
      grantConsent(true);
      const { initAnalytics, trackLegacyAlias, EMIT_LEGACY_ALIASES } =
        freshAnalytics();
      initAnalytics();
      gtag.mockClear();
      trackLegacyAlias('sign_up', { method: 'keypair' });

      expect(EMIT_LEGACY_ALIASES).toBe(true);
      expect(gtag).toHaveBeenCalledWith('event', 'sign_up', {
        property: 'app.covia.ai',
        method: 'keypair',
      });
    });

    it('is gated on consent like any other event', () => {
      const { initAnalytics, trackLegacyAlias } = freshAnalytics();
      initAnalytics();
      trackLegacyAlias('sign_up', { method: 'keypair' });

      expect(gtag).not.toHaveBeenCalledWith(
        'event',
        'sign_up',
        expect.anything(),
      );
    });
  });

  describe('identity', () => {
    it('attaches the hashed DID as user_id on later events', async () => {
      grantConsent(true);
      const { initAnalytics, identify, track, hashIdentity } = freshAnalytics();
      initAnalytics();

      const did = 'did:key:z6MkTestIdentity';
      await identify(did);
      gtag.mockClear();
      track('product_feature_used', { feature_id: 'create_agent' });

      expect(gtag).toHaveBeenCalledWith('event', 'product_feature_used', {
        property: 'app.covia.ai',
        user_id: await hashIdentity(did),
        feature_id: 'create_agent',
      });
    });

    it('never puts the raw DID into a payload', async () => {
      grantConsent(true);
      const { initAnalytics, identify } = freshAnalytics();
      initAnalytics();

      const did = 'did:key:z6MkTestIdentity';
      await identify(did);

      expect(JSON.stringify(gtag.mock.calls)).not.toContain(did);
    });

    it('drops the association on sign-out', async () => {
      grantConsent(true);
      const { initAnalytics, identify, resetIdentity, track } = freshAnalytics();
      initAnalytics();

      await identify('did:key:z6MkTestIdentity');
      resetIdentity();
      gtag.mockClear();
      track('product_login', { method: 'keypair' });

      expect(gtag).toHaveBeenCalledWith('event', 'product_login', {
        property: 'app.covia.ai',
        method: 'keypair',
      });
    });
  });
});
