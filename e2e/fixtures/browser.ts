import type { Page } from "@playwright/test";
import { CONSENT_KEY, PRIVACY_POLICY_VERSION } from "@/lib/consent";

/**
 * Store an essential-only consent decision before the app loads, so the
 * cookie banner never covers what a test clicks and analytics stays off.
 */
export async function seedConsent(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, version }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          categories: { essential: true, analytics: false, marketing: false },
          version,
          givenAt: new Date(0).toISOString(),
        }),
      ),
    { key: CONSENT_KEY, version: PRIVACY_POLICY_VERSION },
  );
}
