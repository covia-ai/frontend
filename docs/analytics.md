# Analytics

Implements **Phase 3** of the D070 analytics + telemetry strategy. The canonical
spec is `docs/ANALYTICS-STRATEGY.md` in the `covia-website` repo; section
references below (§) point there.

Both product surfaces — `app.covia.ai` (production) and `preview.covia.ai`
(staging) — are built from this codebase, so the instrumentation lands once and
`property` is derived from the hostname at runtime.

## Layout

| File | Role |
| --- | --- |
| `src/lib/consent.ts` | Consent record storage, categories, DNT detection (§5.1, §5.3) |
| `src/components/CookieConsent.tsx` | Banner + preferences drawer |
| `src/lib/analytics.ts` | GA4 + PostHog loading, `track()`, `identify()` (§2.1, §2.2, §8.1) |
| `src/components/analytics/Analytics.tsx` | Boots the above from the root layout |
| `src/components/PageViewTracker.tsx` | `content_page_view` on route change |
| `src/lib/utils.ts` → `gtmEvent` | Product event helpers, now a shim over `track()` |

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | no | unset | PostHog project API key. **PostHog does not load at all while this is unset**, so the integration is inert until it is configured. |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | `https://eu.i.posthog.com` | PostHog ingestion host. EU cloud is the default given the GDPR/PDPA posture in the privacy policy; set the US host explicitly if the project is created there. |
| `NEXT_PUBLIC_POSTHOG_SESSION_RECORDING` | no | unset (off) | Set to `true` to enable session replay. **Do not set this yet** — see "Session replay" below. |
| `NEXT_PUBLIC_ANALYTICS_DEBUG` | no | unset (off) | Set to `true` to let a non-production host send to the real property. Off by default so local development never pollutes GA4. |

The GA4 measurement ID (`G-CS4QNLYT4M`) is a constant, not an env var: it is
shared across covia.ai, docs.covia.ai, app.covia.ai and preview.covia.ai, and a
second property must never be created (§2.1).

## Consent

Three categories — essential, analytics, marketing — stored under the
`covia-consent` key in both localStorage and a same-site cookie, in the same
record shape covia.ai and docs.covia.ai use. Writing a decision dispatches
`covia-consent-change`; `openConsentPreferences()` dispatches
`covia-open-consent-drawer` and reopens the drawer from anywhere (the privacy
policy page offers this as the withdrawal route).

Nothing loads before consent:

- Under **Do Not Track**, neither vendor is loaded at all. gtag.js has no DNT
  setting of its own, so honouring it means declining to inject the tag (§5.3).
- Off `app.covia.ai` / `preview.covia.ai`, nothing loads unless
  `NEXT_PUBLIC_ANALYTICS_DEBUG=true`.
- Without an analytics grant, no tag is injected and `track()` is a no-op.
- **Consent Mode v2**: `app/layout.tsx` queues a `denied` default in `<head>`
  before anything can run; a grant sends the matching `consent update`. A
  withdrawal sends `denied` again, because gtag.js cannot be unloaded.

A decision made under the previous binary `react-cookie-consent` banner is
migrated once, silently, so returning users are not asked twice.

## Identity (§4)

`user_id` is `sha256(...).slice(0,16)`, resolved by `resolveAnalyticsId` in
preference order:

1. **`covia_uid`** — a hash the venue precomputed. Preferred, so the browser
   never handles a raw address. No venue emits this yet; the client is ready
   for it, so adopting it needs no frontend change.
2. **`sha256(email)`** — for OAuth accounts. The venue puts an `email` claim in
   the JWT it issues ([`LoginProviders.java`](https://github.com/covia-ai/covia-repo)),
   so the client already holds one. It is hashed in memory and never stored,
   logged or transmitted.
3. **`sha256(did)`** — for device-key accounts, which have no email anywhere in
   the system.

### The normalisation is load-bearing

covia-website hashes `email.trim().toLowerCase()`. This repo must do exactly
the same or the two properties produce different ids for the same person and
the cross-property join fails **with no error anywhere** — you would simply see
two users. A test pins `Alice@Corp.com`, `ALICE@CORP.COM` and a padded variant
all resolving to one id. Do not "simplify" it.

### What this buys

- §10's cross-property attribution closes: a covia.ai form submit and a later
  app sign-in share a `user_id`.
- The same hash is stored in Brevo, so the CRM joins too.
- **Delete-by-email (§5.8) works.** Given an email in a deletion request, you
  can compute the hash and find that person's analytics records. With a hashed
  DID you could not.

### Device-key accounts stay unjoined

They have no email, so they keep the DID hash. In-app retention and cohorts
work for them; marketing attribution cannot. That is inherent, not a gap to
close: a device-key user has never given us an address on any surface.

A person who uses both a device key and an OAuth account on the same venue
counts as two users. Linking those is venue-side account work, not analytics.

## Cross-domain measurement

`gtag('config', …)` sets `linker.domains` to `['covia.ai', 'docs.covia.ai',
'app.covia.ai', 'preview.covia.ai']` with `accept_incoming: true` (§8.1). The
array must stay identical to the ones in covia-website's `GoogleAnalytics.tsx`
and covia-docs' `analytics.ts`, or `client_id` stops surviving the hop between
properties. A test asserts its exact contents.

## Why direct gtag, not GTM

This repo previously loaded a GTM container (`GTM-K5CKZL5G`) and pushed events
into its dataLayer. GA4 is now configured directly instead, because:

- A measurement ID configured from both a GTM tag and a page-level
  `gtag('config')` double-counts every page view. Exactly one owner is allowed.
- The linker domains have to live in code, where a review can see them drift.
- The container loaded unconditionally, before any consent decision.
- §2.4 rejects GTM for this estate; Phases 1 and 2 both shipped direct gtag.

`gtmEvent` kept its name and its exported shape, so no call site moved — only
its implementation changed.

Container `GTM-K5CKZL5G` (Covia Labs account, container named `www.covia.ai`)
was audited before removal. It held three tags, all GA4 against the same
measurement ID, and nothing else — no Clarity, LinkedIn, Meta, Ads, Floodlight,
or custom HTML/image tags:

| Tag | Trigger | Sent to GA4 as |
| --- | --- | --- |
| Google Tag G-CS4QNLYT4M | Initialization – All Pages | GA4 config + one automatic `page_view` per hard load |
| GA4 - Event - Button Clicks | Custom event `button_click` | `click`, param `button_label` |
| GA4 - Event - Product Events | Custom event, regex of 16 names | Event name passed through, param `venue_id` |

Neither covia.ai nor docs.covia.ai loads this container, so the app was its only
consumer and it is dormant after this change. `@next/third-parties` remains a
dependency in case a container is ever wanted again.

Three consequences of the switch, all confirmed against that audit:

- **Client-side route changes were never counted.** The container's `Page View`
  and `History Change` triggers had no tags attached, and `page_view` was not in
  the product-events regex — so `gtmEvent.pageView()` pushed to the dataLayer
  and nothing consumed it. GA4 saw one page view per hard load, which in an SPA
  misses most navigation. `PageViewTracker` now sends one per route change, so
  app page-view counts should rise sharply. That is recovered data.
- **`button_click` used to arrive as `click`** with a single `button_label`
  param. It now arrives as `button_click` with `button_name` and `custom_param`.
  Reports keyed on `click` need repointing.
- **`sign_up` is now `product_login`** (see the note further down), so `sign_up`
  stops appearing.

The 16 product events were forwarded under their own names, so those are
unchanged.

## Events

Existing event names are preserved so current GA4 reports keep working. Where
§3.2 names an event for this surface, that taxonomy event is emitted as well.
Names are sent with underscores throughout — `product_login`, never
`product.login` — because GA4 treats the two as different events.

Every event carries `property` (`app.covia.ai` / `preview.covia.ai` /
`app-local`) and, once identified, `user_id` (§3.3).

### D070 taxonomy events

| Event | Params | Fired from |
| --- | --- | --- |
| `content_page_view` | `path` | Route change, via `PageViewTracker` |
| `product_login` | `method` (`oauth` / `keypair`) | OAuth callback; device-key sign-in |
| `product_signup` | `source` | A newly generated device key — the only first-time identity this client can observe |
| `product_feature_used` | `feature_id` | `run_operation`, `create_agent`, `send_agent_message`, `create_asset`, `connect_venue` |
| `agent_did_issued` | `type`, `source` | Device-key dialog; profile Keys tab |

`agent.venue_started`, `agent.venue_heartbeat`, `agent.operation_invoked` and
`agent.job_completed` are venue-side events and belong to Phase 4. The app's
`connect_venue` is a different thing: a client connecting to a venue that is
already running.

### Retained product events

`button_click`, `form_submit`, `connect_venue`, `connect_venue_failed`,
`remove_venue`, `create_asset`, `create_asset_failed`, `create_agent`,
`create_agent_failed`, `delete_agent`, `delete_agent_failed`, `suspend_agent`,
`suspend_agent_failed`, `resume_agent`, `resume_agent_failed`,
`send_agent_message`, `send_agent_message_failed`.

### Transition aliases (temporary)

Two event names changed at the GTM cutover. Both are still emitted under their
old names so existing GA4 reports do not go flat:

| Action | New name | Deprecated alias still emitted |
| --- | --- | --- |
| `gtmEvent.signUp(method)` | `product_login` `{ method }` | `sign_up` `{ method }` |
| `gtmEvent.buttonClick(name, param)` | `button_click` `{ button_name, custom_param }` | `click` `{ button_label, custom_param }` |

These reproduce exactly what the retired container sent: it renamed
`button_click` → `click`, mapping the `button_name` variable to a
`button_label` parameter, and passed `sign_up` through with `method`. The other
sixteen product events were forwarded under their own names, so they need no
alias and have none.

Note that GA4's enhanced measurement also emits an event named `click` for
outbound links, so reports on that name were already a mix of the two sources.

**To remove:** set `EMIT_LEGACY_ALIASES` to `false` in `src/lib/analytics.ts`,
confirm nothing has gone flat, then delete the constant, `trackLegacyAlias`,
its two call sites in `src/lib/utils.ts`, and the alias tests. Do this once no
GA4 exploration or Looker dashboard keys on `click` or `sign_up`. Each alias is
a separate event name, so nothing is double-counted, but event volume roughly
doubles for these two actions — which counts against PostHog's free tier.

### Deliberate behaviour changes

Two behaviours changed deliberately:

- `gtmEvent.signUp()` now emits `product_login`, not `sign_up`. It always fired
  on sign-in — the app holds no server-side state and cannot tell a first
  sign-in from a repeat one — so the old name overstated what it measured.
- It now fires for **every** completed device-key sign-in. Previously the
  topbar sign-in route was invisible to analytics while the `/signUp` page's
  was not, which made the count wrong rather than conservative.

## Credentials never reach a vendor

The OAuth callback URL carries a bearer token in its query string. Both vendors
are kept away from it:

- `/auth/callback` is never recorded, in any form.
- `token`, `access_token`, `refresh_token`, `id_token` and `code` are stripped
  from every path before it is sent.
- PostHog's `capture_pageview` and `autocapture` are **off**, and a
  `sanitize_properties` hook scrubs `$current_url` and `$referrer`. Left on,
  PostHog's automatic capture would have recorded the raw callback URL.

`autocapture` is off for a second reason: on this app, element text carries
asset names, agent names and DIDs.

## Session replay

**Off, and must stay off until the privacy policy discloses it.**

Privacy policy v1.2 (`src/content/legal/privacy.ts`) names PostHog as a
processor, which is what permits events. It also states plainly that we do not
record your screen or session, so enabling replay contradicts the published
policy until that sentence changes.

Replay on this app would capture job inputs and outputs, agent transcripts,
workspace and asset content, and secret names. PostHog masks form inputs by
default but not arbitrary rendered text.

Before setting `NEXT_PUBLIC_POSTHOG_SESSION_RECORDING=true`:

1. Amend the policy: remove the "we do not record your screen or session"
   commitment, disclose replay and what it captures, bump the version and
   effective date, and bump `PRIVACY_POLICY_VERSION` in `src/lib/consent.ts`
   to match (which re-prompts every user for consent).
2. Agree a masking configuration covering job, asset, workspace and agent-chat
   surfaces.
3. Update the public telemetry manifest at `covia.ai/telemetry` (§7).

Note that adding PostHog **at all**, events only and no replay, makes it a
sub-processor. Policy v1.2 covers that case; `NEXT_PUBLIC_POSTHOG_KEY` is still
unset by default so nothing loads until someone deliberately configures it.

### Retention

**GA4 has no 90-day option.** A standard property offers exactly two values for
user and event data: 2 months or 14 months. D070 §5.7's "90 days raw" was
written without checking, and is not configurable.

Configured on 2026-08-28 in property "Main website" (`G-CS4QNLYT4M`): **Event
data 14 months, User data 14 months** — the maximum a standard property allows.
Event data had been on 2 months, so granular data older than that was already
being deleted.

What that setting does and does not cover, in Google's own words on the page:
*"These controls don't affect most standard reporting, which is based on
aggregated data."*

- **Aggregated standard reports are kept indefinitely.** Users, sessions, page
  views, events by name, traffic sources, conversions, trends over time. The
  retention setting never deletes these.
- **What expires at 14 months** is the granular user-and-event-level data tied
  to cookies and identifiers, which is what Explorations and user-scoped Data
  API queries read. Past the window you cannot build a *new* exploration
  reaching that far back.

Policy v1.2 describes this as "up to 14 months" for granular events with
aggregates indefinite, which matches the configuration.

**PostHog is not configured yet** — no project exists, so there is nothing to
set. When one is created, check its retention against the policy: the published
commitment is 14 months for granular events, so PostHog must be at or below
that, or the policy needs amending again.

## Verifying

```bash
pnpm test          # includes consent, analytics and CookieConsent suites
pnpm lint
pnpm build
```

To watch real events, run with `NEXT_PUBLIC_ANALYTICS_DEBUG=true`, accept
analytics in the banner, and check GA4 DebugView. To confirm the cross-domain
linker end to end, follow a link from covia.ai to app.covia.ai and check that
the `_gl` parameter arrives and that GA4 reports one user, not two.
