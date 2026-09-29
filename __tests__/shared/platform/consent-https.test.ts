/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://app.covia.ai/"}
 */
/**
 * The consent cookie carries Secure when the page is served over HTTPS
 * (frontend#435). Separate file because the page URL is fixed per test
 * environment; the http case lives in consent.test.ts.
 */
import { CONSENT_KEY, writeConsent } from '@/lib/consent';

it('marks the consent cookie Secure on https', () => {
  const set = jest.spyOn(Document.prototype, 'cookie', 'set');
  try {
    writeConsent({ essential: true, analytics: false, marketing: false });
    const written = set.mock.calls.map(([c]) => c).find((c) => c.startsWith(`${CONSENT_KEY}=`));
    expect(written).toMatch(/; SameSite=Lax; Secure$/);
  } finally {
    set.mockRestore();
  }
});
