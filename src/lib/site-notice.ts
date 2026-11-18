// Site-wide outage / maintenance notice (frontend#532, security OI-39).
//
// The notice is a small JSON file hosted apart from the venues and from this
// app, so it stays readable while a venue is down and can be posted or cleared
// without a frontend deploy. Where it lives is configuration
// (NEXT_PUBLIC_SITE_NOTICE_URL); with no URL the banner is off.
//
//   { "message": "venue-1 is unavailable while we restore it.",
//     "level": "warning", "until": "2026-11-20T12:00:00Z", "link": "https://…" }
//
// Everything about it fails quietly: a missing, unreachable, oversized or
// invalid file means no banner, never a broken page.

export type SiteNoticeLevel = "info" | "warning" | "outage";

export type SiteNotice = {
  message: string;
  level: SiteNoticeLevel;
  /** Epoch ms after which the notice hides itself. */
  until?: number;
  /** "More info" link; https only. */
  link?: string;
};

export const SITE_NOTICE_LEVELS: readonly SiteNoticeLevel[] = ["info", "warning", "outage"];

/** Longest message shown; anything longer is treated as a malformed file. */
export const MAX_NOTICE_MESSAGE_LENGTH = 500;

/** Largest notice file read, in characters. A notice is a few hundred bytes. */
export const MAX_NOTICE_FILE_LENGTH = 16_384;

export function siteNoticeUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_NOTICE_URL?.trim();
  return url ? url : null;
}

/**
 * Validates a parsed notice file. Null for anything that is not a usable,
 * current notice: wrong shape, empty or overlong message, unknown level,
 * unparseable or past `until`. A bad `link` is dropped rather than rejecting
 * the notice — the message is what matters during an outage.
 */
export function parseSiteNotice(raw: unknown, now: number = Date.now()): SiteNotice | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { message, level, until, link } = raw as Record<string, unknown>;

  if (typeof message !== "string") return null;
  const text = message.trim();
  if (!text || text.length > MAX_NOTICE_MESSAGE_LENGTH) return null;

  if (typeof level !== "string" || !SITE_NOTICE_LEVELS.includes(level as SiteNoticeLevel)) return null;

  const notice: SiteNotice = { message: text, level: level as SiteNoticeLevel };

  if (until !== undefined && until !== null) {
    if (typeof until !== "string") return null;
    const ms = Date.parse(until);
    if (Number.isNaN(ms) || ms <= now) return null;
    notice.until = ms;
  }

  const safeLink = httpsUrl(link);
  if (safeLink) notice.link = safeLink;

  return notice;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Identifies one notice, so dismissing it doesn't hide the next one posted. */
export function noticeFingerprint(notice: SiteNotice): string {
  return JSON.stringify([notice.level, notice.message, notice.until ?? null, notice.link ?? null]);
}

/**
 * Fetches and validates the notice. Resolves to null on any failure (network,
 * timeout, non-2xx, oversized, invalid JSON, invalid notice): the caller
 * shows nothing.
 */
export async function fetchSiteNotice(
  url: string,
  { timeoutMs = 8_000, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<SiteNotice | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > MAX_NOTICE_FILE_LENGTH) return null;
    return parseSiteNotice(JSON.parse(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

// Session-scoped dismissal for info and warning notices. Outage notices are
// never stored: they come back on reload (frontend#532).
const DISMISSED_KEY = "site-notice-dismissed";

export function isNoticeDismissed(notice: SiteNotice, storage: Pick<Storage, "getItem"> | null): boolean {
  if (notice.level === "outage" || !storage) return false;
  try {
    return storage.getItem(DISMISSED_KEY) === noticeFingerprint(notice);
  } catch {
    return false;
  }
}

export function rememberNoticeDismissed(notice: SiteNotice, storage: Pick<Storage, "setItem"> | null): void {
  if (notice.level === "outage" || !storage) return;
  try {
    storage.setItem(DISMISSED_KEY, noticeFingerprint(notice));
  } catch {
    // Storage blocked: the dismissal lasts until the page is reloaded.
  }
}
