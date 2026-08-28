/**
 * GA4 + PostHog instrumentation for app.covia.ai and preview.covia.ai.
 *
 * Implements Phase 3 of the D070 analytics strategy
 * (`covia-website/docs/ANALYTICS-STRATEGY.md`):
 *
 *   §2.1 / §8.1 — one measurement ID across the estate + cross-domain linker
 *   §2.2        — PostHog product analytics
 *   §3.2 / §3.3 — event taxonomy and the params every event carries
 *   §4          — identity, with the deviation recorded below
 *   §5.1        — cookie consent gates all web analytics
 *   §5.3        — Do Not Track respected
 *
 * Both product surfaces are built from this one codebase, so `property` is
 * derived from the hostname at runtime rather than baked in at build time.
 *
 * Why direct gtag instead of the GTM container this repo used to load: a
 * measurement ID must be configured from exactly one place or every page view
 * is counted twice, and the linker domains have to live in code where a PR can
 * see them drift (D070 §2.4, §8.1). `gtmEvent` in `lib/utils` is now a thin
 * shim over `track()`, so existing call sites were left untouched.
 *
 * IDENTITY (§4). OAuth accounts hash the email, exactly as the spec defines.
 * The venue puts an `email` claim in the JWT it issues, so the client already
 * holds one; it is hashed in memory here and never stored or transmitted.
 * Device-key accounts have no email anywhere in the system and fall back to a
 * hashed DID, which keeps in-app retention and cohorts working for them but
 * cannot join to covia.ai or Brevo.
 *
 * The end state is for the venue to emit a precomputed `covia_uid` claim so
 * the browser never touches a raw address, and then to drop the `email` and
 * `name` claims from the token entirely. `resolveAnalyticsId` prefers that
 * claim already, so adopting it is a venue-side change with no client work.
 */

import posthog from 'posthog-js'
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_KEY,
  hasConsent,
  isDoNotTrackEnabled,
} from '@/lib/consent'
import { decodeJwtClaims } from '@/lib/identity-token'

/** Shared across covia.ai, docs, app and preview — never create a second property. */
export const GA_MEASUREMENT_ID = 'G-CS4QNLYT4M'

/**
 * Cross-domain linker domains (D070 §8.1). Must stay identical to the arrays
 * in covia-website's `GoogleAnalytics.tsx` and covia-docs' `analytics.ts`, or
 * `client_id` stops surviving the hop between properties.
 */
export const LINKER_DOMAINS = [
  'covia.ai',
  'docs.covia.ai',
  'app.covia.ai',
  'preview.covia.ai',
]

/** Hosts that may send to the production property. */
const PRODUCTION_HOSTS: Record<string, string> = {
  'app.covia.ai': 'app.covia.ai',
  'preview.covia.ai': 'preview.covia.ai',
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

/**
 * Session replay stays off unless explicitly enabled.
 *
 * D070 §5.2 and the brief both require confirming replay against the privacy
 * policy first. Privacy policy v1.0 does not name PostHog as a processor and
 * describes analytics as "aggregated usage events"; replay on this app would
 * capture job inputs and outputs, agent transcripts, workspace and asset
 * content. PostHog masks form inputs by default but not arbitrary rendered
 * text, so this must not be switched on before a policy update and a masking
 * configuration are agreed.
 */
const SESSION_RECORDING_ENABLED =
  process.env.NEXT_PUBLIC_POSTHOG_SESSION_RECORDING === 'true'

/** Lets a developer point a local build at the real property on purpose. */
const ANALYTICS_DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === 'true'

/**
 * Query parameters that can carry a bearer credential. Stripped from every
 * path that reaches an analytics vendor, and from PostHog's automatic
 * `$current_url` / `$referrer` properties.
 */
const SENSITIVE_QUERY_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'code',
]

/** Paths whose URLs are never sent anywhere, in any form. */
const UNTRACKED_PATHS = new Set(['/auth/callback'])

let gtagLoaded = false
let posthogLoaded = false
let analyticsGranted = false
let currentUserId: string | null = null

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Which surface this build is currently running as (D070 §3.3). */
export function analyticsProperty(): string {
  if (typeof window === 'undefined') return 'app'
  return PRODUCTION_HOSTS[window.location.hostname] ?? 'app-local'
}

/** True when this host is allowed to send to the production property. */
function isMeasurableHost(): boolean {
  if (typeof window === 'undefined') return false
  if (ANALYTICS_DEBUG) return true
  return window.location.hostname in PRODUCTION_HOSTS
}

/**
 * Removes credential-shaped parameters from a path+query, returning null for
 * routes that must never be recorded at all.
 */
export function buildAnalyticsPath(
  pathname: string,
  rawQuery: string,
): string | null {
  // Authentication callbacks carry bearer credentials in the query string.
  // Never put any part of those URLs in an analytics payload.
  if (UNTRACKED_PATHS.has(pathname)) return null

  const params = new URLSearchParams(rawQuery)
  for (const key of SENSITIVE_QUERY_PARAMS) params.delete(key)
  const query = params.toString()
  return pathname + (query ? `?${query}` : '')
}

/**
 * Strips credentials out of an absolute URL. Used on PostHog's automatic
 * `$current_url` / `$referrer`, which would otherwise capture the raw
 * `/auth/callback?token=…` URL verbatim.
 */
export function sanitizeUrl(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return raw
  }
  if (UNTRACKED_PATHS.has(url.pathname)) return url.origin + url.pathname
  for (const key of SENSITIVE_QUERY_PARAMS) url.searchParams.delete(key)
  return url.toString()
}

/**
 * SHA-256 of the value, truncated to 16 hex characters — the identifier shape
 * D070 §4.2 defines. Returns null when WebCrypto is unavailable (an insecure
 * origin); we drop the identification rather than fall back to a weaker hash.
 */
export async function hashIdentity(value: string): Promise<string | null> {
  const normalised = value.trim()
  if (!normalised) return null
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const digest = await subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalised),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

/**
 * Injects gtag.js and applies the shared config. Idempotent — the `config`
 * call emits the initial `page_view`, so callers must not fire one themselves
 * on the load that first brings the tag in.
 */
function ensureGtag(): void {
  if (gtagLoaded) return
  gtagLoaded = true

  const layer = (window.dataLayer = window.dataLayer ?? [])
  // `app/layout.tsx` already defines this shim so the Consent Mode v2 default
  // can be queued before anything loads. Only define it if that is missing.
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      layer.push(arguments)
    }
  }

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
    // Rewrites in-site links to carry `_gl=...` so `client_id` survives the
    // hop from covia.ai / docs.covia.ai, and accepts the same parameter on the
    // way in. Same measurement ID on all four properties.
    linker: {
      domains: LINKER_DOMAINS,
      accept_incoming: true,
    },
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

/**
 * Boots PostHog. No-ops without a project key, so the integration is inert
 * until `NEXT_PUBLIC_POSTHOG_KEY` is configured.
 *
 * Capture defaults are deliberately conservative for a product surface that
 * renders job outputs, agent transcripts and asset content:
 *   - `autocapture: false`   — element text would carry asset and agent names
 *   - `capture_pageview: false` — page views are sent manually with the
 *     credential-stripped path from `buildAnalyticsPath`
 *   - session replay off unless explicitly enabled (see SESSION_RECORDING_ENABLED)
 */
function ensurePostHog(): void {
  if (posthogLoaded || !POSTHOG_KEY) return
  posthogLoaded = true

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
    respect_dnt: true,
    disable_session_recording: !SESSION_RECORDING_ENABLED,
    session_recording: {
      maskAllInputs: true,
    },
    sanitize_properties: (properties) => ({
      ...properties,
      $current_url: sanitizeUrl(properties.$current_url),
      $referrer: sanitizeUrl(properties.$referrer),
      property: analyticsProperty(),
    }),
  })
}

/**
 * Sends an event to both vendors, adding the params D070 §3.3 puts on
 * everything. A no-op until analytics consent has been granted.
 *
 * Event names use underscores throughout — `product_signup`, never
 * `product.signup`. GA4 accepts both but treats them as different events.
 */
export function track(
  event: string,
  params: Record<string, unknown> = {},
): void {
  if (!analyticsGranted || typeof window === 'undefined') return

  const common = {
    property: analyticsProperty(),
    ...(currentUserId ? { user_id: currentUserId } : {}),
    ...params,
  }

  window.gtag?.('event', event, common)
  if (posthogLoaded) posthog.capture(event, common)
}

/**
 * Whether to keep emitting the GA4 event names the retired GTM container used
 * to produce, alongside the D070 taxonomy names.
 *
 * TEMPORARY — delete this, `trackLegacyAlias`, and its call sites in
 * `lib/utils` once no GA4 report, exploration or Looker dashboard keys on
 * `click` or `sign_up`. Nothing else needs an alias: the container passed the
 * other sixteen product events through under their own names.
 *
 * Each alias is a distinct event name, so nothing is double-counted — but
 * total event volume roughly doubles for the two actions involved, which
 * matters against PostHog's free-tier allowance.
 */
export const EMIT_LEGACY_ALIASES = true

/**
 * Emits a deprecated event name kept for report continuity. Separate from
 * `track()` so every alias is greppable and can be removed in one pass.
 */
export function trackLegacyAlias(
  event: string,
  params: Record<string, unknown> = {},
): void {
  if (!EMIT_LEGACY_ALIASES) return
  track(event, params)
}

/** `content_page_view` for a client-side navigation (D070 §3.2). */
export function trackPageView(path: string, title: string): void {
  if (!analyticsGranted || typeof window === 'undefined') return
  // GA4's own page_view: `set` first so the event carries the sanitised path
  // rather than the real location, which may hold credentials.
  window.gtag?.('set', { page_path: path, page_title: title })
  window.gtag?.('event', 'page_view')
  track('content_page_view', { path })
}

/** What a sign-in gives us to derive an analytics identity from. */
export type AnalyticsIdentity = {
  did: string
  /** The venue-issued JWT, for OAuth accounts. Device keys have none. */
  token?: string
}

/**
 * Picks the identifier for a signed-in account, in order of preference:
 *
 *   1. `covia_uid` — a hash the venue precomputed. Preferred so the browser
 *      need not handle the raw address. Not emitted by any venue yet.
 *   2. `sha256(email)` — the §4 identifier. Lowercased and trimmed to match
 *      `hashEmail` in covia-website exactly; without that the two properties
 *      produce different ids for the same person and the join fails silently.
 *   3. `sha256(did)` — device-key accounts, which have no email at all.
 *
 * Exported for tests: getting the normalisation wrong breaks cross-property
 * attribution with no error anywhere.
 */
export async function resolveAnalyticsId(
  identity: AnalyticsIdentity,
): Promise<string | null> {
  const claims = identity.token ? decodeJwtClaims(identity.token) : null

  const precomputed = claims?.covia_uid
  if (typeof precomputed === 'string' && precomputed) return precomputed

  const email = claims?.email
  if (typeof email === 'string' && email.trim()) {
    return hashIdentity(email.trim().toLowerCase())
  }

  return hashIdentity(identity.did)
}

/**
 * Ties this browser's events to a stable pseudonymous id (D070 §4).
 *
 * Safe to call on every sign-in; repeat calls for the same account are cheap
 * and idempotent. The raw email, where there is one, is hashed in memory and
 * never stored or sent.
 */
export async function identify(
  identity: AnalyticsIdentity,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const userId = await resolveAnalyticsId(identity)
  if (!userId) return
  currentUserId = userId

  if (!analyticsGranted || typeof window === 'undefined') return

  window.gtag?.('config', GA_MEASUREMENT_ID, {
    user_id: userId,
    anonymize_ip: true,
    send_page_view: false,
    linker: { domains: LINKER_DOMAINS, accept_incoming: true },
  })

  if (posthogLoaded) {
    posthog.identify(userId, {
      first_seen_at: new Date().toISOString(),
      signup_property: analyticsProperty(),
      ...properties,
    })
  }
}

/** Drops the identity association — call on sign-out. */
export function resetIdentity(): void {
  currentUserId = null
  if (typeof window === 'undefined') return
  window.gtag?.('config', GA_MEASUREMENT_ID, {
    user_id: undefined,
    anonymize_ip: true,
    send_page_view: false,
    linker: { domains: LINKER_DOMAINS, accept_incoming: true },
  })
  if (posthogLoaded) posthog.reset()
}

/** Applies a consent decision: loads or muzzles both vendors. */
function applyConsent(): void {
  const granted = hasConsent('analytics')
  if (granted === analyticsGranted) return
  analyticsGranted = granted

  if (granted) {
    const firstLoad = !gtagLoaded
    ensureGtag()
    ensurePostHog()
    // Consent Mode v2: `app/layout.tsx` queues a `denied` default before
    // anything loads, so storage has to be re-granted explicitly.
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
    if (posthogLoaded) {
      posthog.opt_in_capturing()
      if (SESSION_RECORDING_ENABLED) posthog.startSessionRecording()
    }
    if (firstLoad) {
      // `config` above emitted the GA4 page_view; pair it with the custom
      // event for the page the decision was made on.
      const path = buildAnalyticsPath(
        window.location.pathname,
        window.location.search.replace(/^\?/, ''),
      )
      if (path) track('content_page_view', { path })
    }
    // An identify() that ran before consent recorded the id locally only.
    if (currentUserId) {
      window.gtag?.('config', GA_MEASUREMENT_ID, {
        user_id: currentUserId,
        anonymize_ip: true,
        send_page_view: false,
        linker: { domains: LINKER_DOMAINS, accept_incoming: true },
      })
      if (posthogLoaded) posthog.identify(currentUserId)
    }
    return
  }

  // gtag.js cannot be unloaded, so tell it to stop using storage. track() and
  // trackPageView() also stop emitting, via `analyticsGranted`.
  if (gtagLoaded) {
    window.gtag?.('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }
  if (posthogLoaded) {
    posthog.stopSessionRecording()
    posthog.opt_out_capturing()
  }
}

/**
 * Subscribes to consent and loads the vendors once analytics consent exists.
 * Returns a teardown function. Safe to call during SSR; does nothing there.
 */
export function initAnalytics(): () => void {
  if (typeof window === 'undefined') return () => {}
  // gtag.js has no Do Not Track setting, so DNT is honoured by never loading
  // it. PostHog's respect_dnt covers its side, but skip it too for symmetry.
  if (isDoNotTrackEnabled()) return () => {}
  if (!isMeasurableHost()) return () => {}

  applyConsent()

  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) applyConsent()
  }
  window.addEventListener(CONSENT_CHANGE_EVENT, applyConsent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, applyConsent)
    window.removeEventListener('storage', onStorage)
  }
}
