import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { notifyError, notifySuccess } from "@/lib/notify"
import { track, trackLegacyAlias, trackPageView } from "@/lib/analytics"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Chat/prompt-style inputs (AIPrompt, AgentChatPanel's composer) want their
// placeholder to read as a soft suggestion, not full-strength body text —
// shadcn's Input/Textarea default to placeholder:text-muted-foreground at
// full opacity, which (especially against these components' very dark
// backgrounds) looks as prominent as real typed text. Dial it down via a
// call-site override rather than editing the shared ui/ primitives.
export const SUGGESTION_PLACEHOLDER_CLASS = "placeholder:text-muted-foreground/60"

export function getLicenseUrl(licenseName : string) {
  if(licenseName.trim() ==  "CC BY 4.0")
    return "https://creativecommons.org/licenses/by/4.0/"
}
export function getContentTypeForFile(filename: string): [string, string] {

    const mimeType =  mime.contentType(filename) || "";
    const contentType = mimeType.split(';')[0];
    // Binary types (pdf, images, zip, …) have no charset segment — fields
    // like AssetMetadataFields.encoding are always-string, so this must
    // never come back as undefined.
    const charset  = mimeType.split(';')[1]?.split("=")[1] ?? "";
    return [contentType,charset];
}
export function getExecutionTime(date1:string, date2:string) {
  const milliseconds1 = new Date(date1).getTime();
  const milliseconds2 = new Date(date2).getTime();
  const differenceInMilliseconds = milliseconds2 - milliseconds1;
  const differenceInSeconds = differenceInMilliseconds / 1000;
  const differenceInMinutes = differenceInMilliseconds / 60000;
  const differenceInHours = differenceInMilliseconds / 3600000;

  if(differenceInHours >= 1) {
    const hours = Math.floor(differenceInHours);
    const mins = Math.round((differenceInHours - hours) * 60);
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  if(differenceInMinutes >= 1) {
    const mins = Math.floor(differenceInMinutes);
    const secs = Math.round((differenceInMinutes - mins) * 60);
    return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
  }
  if(differenceInSeconds >= 1)
    return `${Math.round(differenceInSeconds)} sec`;
  return `${Math.round(differenceInMilliseconds)} ms`;
}

// Scannable "3m ago" form for list views — pair with the exact timestamp in
// a tooltip rather than showing it alone, since relative time alone loses
// precision developers need for correlating with logs.
export function formatRelativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString();
}

// Countdown form for a future timestamp — "in 2 hr 15 min" style, mirroring
// getExecutionTime's hr/min/sec cascade but counting down to a target instead
// of a duration between two points. Pair with the exact fire time in an
// adjacent cell, same rationale as formatRelativeTime above.
export function formatCountdown(targetMs: number): string {
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return "due now";
  const diffSec = diffMs / 1000;
  const diffMin = diffMs / 60000;
  const diffHour = diffMs / 3600000;

  if (diffHour >= 1) {
    const hours = Math.floor(diffHour);
    const mins = Math.round((diffHour - hours) * 60);
    return mins > 0 ? `in ${hours} hr ${mins} min` : `in ${hours} hr`;
  }
  if (diffMin >= 1) {
    const mins = Math.floor(diffMin);
    const secs = Math.round((diffMin - mins) * 60);
    return secs > 0 ? `in ${mins} min ${secs} sec` : `in ${mins} min`;
  }
  return `in ${Math.round(diffSec)} sec`;
}

// Fixed-interval cadence for a recurring schedule's `repeat.every` — "every
// 5 min" style. Only whole-unit intervals need to look clean here (presets
// are hourly/daily/weekly); anything else falls back to the largest whole
// unit plus a remainder in the next one down.
export function formatInterval(ms: number): string {
  const sec = ms / 1000;
  const min = ms / 60000;
  const hour = ms / 3600000;
  const day = ms / 86400000;

  if (day >= 1) {
    const days = Math.floor(day);
    const hours = Math.round((day - days) * 24);
    return hours > 0 ? `every ${days} d ${hours} hr` : `every ${days} d`;
  }
  if (hour >= 1) {
    const hours = Math.floor(hour);
    const mins = Math.round((hour - hours) * 60);
    return mins > 0 ? `every ${hours} hr ${mins} min` : `every ${hours} hr`;
  }
  if (min >= 1) {
    const mins = Math.floor(min);
    const secs = Math.round((min - mins) * 60);
    return secs > 0 ? `every ${mins} min ${secs} sec` : `every ${mins} min`;
  }
  return `every ${Math.round(sec)} sec`;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function formatDateTime(value: string | number | Date): string {
  try {
    return DATE_TIME_FORMATTER.format(new Date(value));
  } catch {
    return String(value);
  }
}

// List a venue's MCP tools via its native MCP endpoint (JSON-RPC tools/list).
// Job-free: the invoke-based v/ops/mcp/tools-list persists a job per call.
export async function listMcpTools(baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  if (!res.ok) throw new Error(`MCP tools/list failed: ${res.status}`);
  const body = await res.json();
  return Array.isArray(body?.result?.tools) ? body.result.tools : [];
}

export function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Upstream services a venue calls out to (model providers, for one) fail with
// their own JSON error envelope embedded in the venue's message. Surface the
// human-readable message rather than dumping the raw blob at the user.
function embeddedMessage(error: string): string | null {
  const start = error?.indexOf('{') ?? -1;
  if (start === -1) return null;
  try {
    const parsed = JSON.parse(error.slice(start));
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === 'string' && message ? message : null;
  } catch {
    return null;
  }
}

export function friendlyError(error: string): { summary: string; detail: string } {
  const lower = error?.toLowerCase() || '';
  let summary = 'Something went wrong';
  if (lower.includes('timeout') || lower.includes('timed out'))
    summary = 'The operation timed out';
  else if (
    lower.includes('401') || lower.includes('unauthorized') ||
    lower.includes('authentication_error') || lower.includes('api key')
  )
    summary = 'Authentication failed';
  else if (lower.includes('403') || lower.includes('forbidden'))
    summary = 'Access denied';
  else if (lower.includes('404') || lower.includes('not found'))
    summary = 'Resource not found';
  else if (lower.includes('500') || lower.includes('internal server'))
    summary = 'Server error';
  else if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('fetch'))
    summary = 'Connection error';
  else if (lower.includes('parse') || lower.includes('json') || lower.includes('syntax'))
    summary = 'Invalid data format';
  return { summary, detail: embeddedMessage(error) ?? error };
}

// "did:key:z6MkmZJJ…TkBR" — middle-elided identifier: first `chars` characters,
// then an ellipsis, then the last 4 (the tail is what humans compare, the head
// names the scheme). Short values pass through unchanged. This is the standard
// elision for DIDs and public keys — render them via components/DidDisplay.
export function abbreviateDid(did: string, chars = 16): string {
  if (did.length <= chars + 5) return did;
  return `${did.slice(0, chars)}…${did.slice(-4)}`;
}

export async function writeTextToClipboard(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to copy-to-clipboard for browsers that expose the API
      // but reject it outside a secure context or without permission.
    }
  }
  if (!copy(value)) throw new Error("The browser did not accept the clipboard write");
}

export async function copyDataToClipBoard(entityId: string, message: string) {
  try {
    await writeTextToClipboard(entityId);
    notifySuccess(message);
  } catch (error: unknown) {
    notifyError("Unable to copy to clipboard", error);
  }
}

/**
 * Product event helpers.
 *
 * The name is historic: these used to push into the GTM dataLayer. They now
 * go through `lib/analytics.track()`, which is consent-gated and fires to GA4
 * and PostHog. The exported shape is unchanged so no call site had to move.
 *
 * Event names are preserved as they were, so existing GA4 reports keep
 * working. Where D070 §3.2 names an event for this surface, that taxonomy
 * event is emitted as well — `product_login`, `product_signup`,
 * `product_feature_used`, `agent_did_issued`, `content_page_view`.
 */

/** The handful of actions reported as D070 §3.2 `product.feature_used`. */
function feature(featureId: string) {
  track('product_feature_used', { feature_id: featureId })
}

export const gtmEvent = {
  // Button clicks
  buttonClick: (buttonName: string, param: string) => {
    track('button_click', {
      button_name: buttonName,
      custom_param: param,
    })
    // The retired GTM container renamed this to `click` on the way to GA4,
    // mapping button_name → button_label. Note GA4's enhanced measurement
    // also emits an event called `click` for outbound links, so reports on
    // this name were already a mix of the two.
    trackLegacyAlias('click', {
      button_label: buttonName,
      custom_param: param,
    })
    if (buttonName === 'Invoke Operation') feature('run_operation')
  },

  // Page views (for custom page tracking)
  pageView: (pagePath: string, pageTitle: string) => {
    trackPageView(pagePath, pageTitle)
  },

  // Form submissions
  formSubmit: (formName: string, formId?: string) => {
    track('form_submit', { form_name: formName, form_id: formId })
  },

  custom: (eventName: string, params?: Record<string, unknown>) => {
    track(eventName, params ?? {})
  },

  /**
   * Fired when a user completes sign-in. Despite the name this has always run
   * for returning users too — the app holds no server-side state and cannot
   * tell a first sign-in from a repeat one — so it reports D070's
   * `product.login`. Genuinely new identities are reported separately by
   * `didIssued`, which fires when a device key is created.
   */
  signUp: (method: string) => {
    track('product_login', { method })
    // The retired GTM container forwarded this to GA4 as `sign_up`, carrying
    // `method`. Kept so existing reports do not go flat at the cutover.
    trackLegacyAlias('sign_up', { method })
  },

  /**
   * D070 §3.2 `agent.did_issued` — a new identity entering the ecosystem.
   * Also emits `product.signup`, since a freshly generated device key is the
   * one moment this client can honestly call a signup.
   */
  didIssued: (type: 'user' | 'venue' | 'agent', source: string) => {
    track('agent_did_issued', { type, source })
    if (type === 'user') track('product_signup', { source })
  },

  connectVenue: (venueId: string) => {
    track('connect_venue', { venue_id: venueId })
    feature('connect_venue')
  },

  connectVenueFailed: (venueId: string, reason?: string) => {
    track('connect_venue_failed', { venue_id: venueId, reason })
  },

  removeVenue: (venueId: string) => {
    track('remove_venue', { venue_id: venueId })
  },

  /**
   * Takes the content-addressed asset id, never `metadata.name`. An asset name
   * is free text a user typed ("Acme Q3 payroll model"), so sending it would
   * put customer data and business facts into a third-party analytics store.
   * The id answers every question the name did, and identifies nothing.
   */
  createAsset: (assetId: string) => {
    track('create_asset', { asset_id: assetId })
    feature('create_asset')
  },

  /**
   * Registration failed, so there is no content-addressed id to report and no
   * non-identifying stand-in for the name. The failure and its reason are the
   * whole signal.
   */
  createAssetFailed: (reason?: string) => {
    track('create_asset_failed', { reason })
  },

  createAgent: (agentId: string, provider?: string) => {
    track('create_agent', { agent_id: agentId, provider })
    feature('create_agent')
  },

  createAgentFailed: (agentId?: string, reason?: string) => {
    track('create_agent_failed', { agent_id: agentId, reason })
  },

  deleteAgent: (agentId: string) => {
    track('delete_agent', { agent_id: agentId })
  },

  deleteAgentFailed: (agentId: string, reason?: string) => {
    track('delete_agent_failed', { agent_id: agentId, reason })
  },

  suspendAgent: (agentId: string) => {
    track('suspend_agent', { agent_id: agentId })
  },

  suspendAgentFailed: (agentId: string, reason?: string) => {
    track('suspend_agent_failed', { agent_id: agentId, reason })
  },

  resumeAgent: (agentId: string) => {
    track('resume_agent', { agent_id: agentId })
  },

  resumeAgentFailed: (agentId: string, reason?: string) => {
    track('resume_agent_failed', { agent_id: agentId, reason })
  },

  sendAgentMessage: (agentId: string) => {
    track('send_agent_message', { agent_id: agentId })
    feature('send_agent_message')
  },

  sendAgentMessageFailed: (agentId: string, reason?: string) => {
    track('send_agent_message_failed', { agent_id: agentId, reason })
  },
}
