/**
 * Client-side cookie consent storage for app.covia.ai / preview.covia.ai.
 *
 * Implements the `covia-consent-v1` pattern shared with covia.ai
 * (`covia-website` → `src/lib/consent.ts`) and docs.covia.ai
 * (`covia-docs` → `src/lib/analytics.ts`), so the three properties store the
 * same record shape and fire the same events. See D070 §5.1
 * (`covia-website/docs/ANALYTICS-STRATEGY.md`).
 *
 * Stores a 3-category consent record in both localStorage and a same-site
 * cookie. localStorage is what the client reads on mount; the cookie exists so
 * a future server-side or cross-subdomain reader can see the same decision.
 *
 * Consumers:
 *   - CookieConsent (read + write)
 *   - lib/analytics (read, via hasConsent('analytics'))
 *
 * Events:
 *   - `covia-consent-change` — dispatched on window after writeConsent, so
 *     components in the same tab update immediately.
 *   - `covia-open-consent-drawer` — dispatched by the "Cookie preferences"
 *     control; listened to by CookieConsent to open the drawer from anywhere.
 */

export const CONSENT_KEY = 'covia-consent'

/**
 * The privacy policy version this consent record was given against. Bumped
 * whenever `src/content/legal/privacy.ts` materially changes what is
 * collected, which invalidates older records and re-prompts.
 *
 * Note this deliberately tracks the *app's* policy (v1.2, effective
 * 2026-08-28), not covia.ai's ('2026-04-11'). The two properties currently
 * write host-only cookies so the values never meet. Unifying consent across
 * `.covia.ai` (D070 §11) has to reconcile them: the shapes already match,
 * only the version constants differ.
 */
export const PRIVACY_POLICY_VERSION = '2026-08-28'

/** Cookie written by the previous `react-cookie-consent` banner. */
const LEGACY_COOKIE_NAME = 'yourAppCookieConsent'

export type ConsentCategories = {
  essential: true
  analytics: boolean
  marketing: boolean
}

export type StoredConsent = {
  categories: ConsentCategories
  version: string
  givenAt: string
}

export const DEFAULT_CATEGORIES: ConsentCategories = {
  essential: true,
  analytics: false,
  marketing: false,
}

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * True when the browser asks not to be tracked.
 *
 * gtag.js has no Do Not Track setting of its own, so DNT is honoured by
 * declining to load the tag at all (D070 §5.3 — the same approach
 * docs.covia.ai takes). PostHog has `respect_dnt`, which we also set.
 */
export function isDoNotTrackEnabled(): boolean {
  if (!isBrowser()) return false
  const legacy = window as unknown as {
    doNotTrack?: string
    navigator: { doNotTrack?: string; msDoNotTrack?: string }
  }
  return [
    legacy.doNotTrack,
    legacy.navigator?.doNotTrack,
    legacy.navigator?.msDoNotTrack,
  ].some((signal) => signal === '1' || signal === 'yes')
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

/**
 * Parses a stored record, returning null for anything that isn't a
 * well-formed `covia-consent-v1` value.
 */
export function parseConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredConsent
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.categories &&
      typeof parsed.categories.analytics === 'boolean' &&
      typeof parsed.categories.marketing === 'boolean' &&
      typeof parsed.version === 'string' &&
      typeof parsed.givenAt === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Reads stored consent. Returns `null` when nothing usable is stored — first
 * visit, cleared storage, or a record given against an older privacy policy
 * version (which re-prompts rather than assuming the old answer still holds).
 *
 * Callers who treat `null` as "analytics + marketing off, essential on"
 * handle every edge correctly.
 */
export function readConsent(): StoredConsent | null {
  if (!isBrowser()) return null

  let raw: string | null = null
  try {
    raw = localStorage.getItem(CONSENT_KEY)
  } catch {
    // Storage disabled (Safari private mode) — fall back to the cookie.
  }
  if (!raw) {
    const cookie = readCookie(CONSENT_KEY)
    raw = cookie ? decodeURIComponent(cookie) : null
  }

  const parsed = parseConsent(raw)
  if (parsed) {
    // A record given against a superseded policy is not consent to the
    // current one.
    return parsed.version === PRIVACY_POLICY_VERSION ? parsed : null
  }

  return migrateLegacy()
}

/**
 * Upgrades a decision made in the previous `react-cookie-consent` banner.
 *
 * That banner was binary: "Accept All" wrote `true` and granted both
 * analytics and ad storage; "Decline" wrote `false` and denied both. Those map
 * cleanly onto the new categories, so a user who already decided is not asked
 * again. Anything else is treated as no decision.
 */
function migrateLegacy(): StoredConsent | null {
  const legacy = readCookie(LEGACY_COOKIE_NAME)
  if (legacy !== 'true' && legacy !== 'false') return null

  const granted = legacy === 'true'
  const migrated: StoredConsent = {
    categories: { essential: true, analytics: granted, marketing: granted },
    version: PRIVACY_POLICY_VERSION,
    givenAt: new Date().toISOString(),
  }
  // persist() directly, so readConsent() never dispatches a window event:
  // migration is a silent upgrade path, not a user action.
  persist(migrated)
  clearLegacyCookie()
  return migrated
}

function clearLegacyCookie(): void {
  if (!isBrowser()) return
  document.cookie = `${LEGACY_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

/**
 * Writes a consent record to localStorage + cookie without firing events.
 * Private: used by both writeConsent() (user action) and migrateLegacy()
 * (silent upgrade). Only writeConsent() dispatches `covia-consent-change`.
 */
function persist(record: StoredConsent): void {
  if (!isBrowser()) return
  const value = JSON.stringify(record)
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // Storage disabled — the cookie below still carries the decision.
  }
  // URL-encoded because the value contains quotes and braces.
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

export function writeConsent(categories: ConsentCategories): StoredConsent {
  const record: StoredConsent = {
    categories,
    version: PRIVACY_POLICY_VERSION,
    givenAt: new Date().toISOString(),
  }
  if (!isBrowser()) return record

  persist(record)
  clearLegacyCookie()
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
  return record
}

export const CONSENT_CHANGE_EVENT = 'covia-consent-change'
export const OPEN_CONSENT_DRAWER_EVENT = 'covia-open-consent-drawer'

export function hasConsent(category: keyof ConsentCategories): boolean {
  if (category === 'essential') return true
  const stored = readConsent()
  if (!stored) return false
  return stored.categories[category] === true
}

/** Opens the preferences drawer from anywhere (e.g. a settings link). */
export function openConsentPreferences(): void {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(OPEN_CONSENT_DRAWER_EVENT))
}
