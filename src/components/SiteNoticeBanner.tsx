"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Info, ServerCrash, X } from "lucide-react";
import { browserSessionStorage } from "@/lib/persist-storage";
import {
  fetchSiteNotice,
  isNoticeDismissed,
  noticeFingerprint,
  rememberNoticeDismissed,
  siteNoticeUrl,
  type SiteNotice,
  type SiteNoticeLevel,
} from "@/lib/site-notice";
import { cn } from "@/lib/utils";

/** How often the notice file is re-read, so a posted notice reaches open tabs. */
export const SITE_NOTICE_REFRESH_MS = 5 * 60_000;

// The CSS variable the layout offsets itself by while a notice shows: body
// padding, the fixed sidebar and the sticky top bar (globals.css, sidebar.tsx,
// TopBar.tsx). Unset when no notice shows, so nothing moves.
const HEIGHT_VAR = "--site-notice-h";

// setTimeout's ceiling; an `until` further out is caught by the next refresh.
const MAX_TIMER_MS = 2_147_483_647;

// Fixed colours rather than theme tokens: the banner must read the same in
// both themes, and dark mode's `destructive` is too light for white text.
const LEVEL_STYLES: Record<SiteNoticeLevel, string> = {
  info: "bg-sky-700 text-white",
  warning: "bg-amber-400 text-black",
  outage: "bg-red-700 text-white",
};

const LEVEL_ICONS: Record<SiteNoticeLevel, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  outage: ServerCrash,
};

const LEVEL_LABELS: Record<SiteNoticeLevel, string> = {
  info: "Notice",
  warning: "Warning",
  outage: "Outage",
};

/**
 * Site-wide outage / maintenance banner (frontend#532). Reads the notice file
 * named by NEXT_PUBLIC_SITE_NOTICE_URL on load and every few minutes; shows
 * nothing when that is unset or the file is missing or invalid. Info and
 * warning notices can be dismissed for the session; an outage notice comes
 * back on reload. The message is rendered as plain text.
 */
export function SiteNoticeBanner({ url = siteNoticeUrl() }: { url?: string | null }) {
  const [notice, setNotice] = useState<SiteNotice | null>(null);
  // Dismissed this page view; for outages this is the only record.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const load = () =>
      void fetchSiteNotice(url, { signal: controller.signal }).then((next) => {
        if (!controller.signal.aborted) setNotice(next);
      });
    load();
    const id = setInterval(load, SITE_NOTICE_REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [url]);

  const fingerprint = notice ? noticeFingerprint(notice) : null;

  // Hide at `until` without waiting for the next refresh.
  useEffect(() => {
    if (!notice?.until || !fingerprint) return;
    const delay = notice.until - Date.now();
    if (delay > MAX_TIMER_MS) return;
    const id = setTimeout(() => setExpiredAt(fingerprint), Math.max(0, delay));
    return () => clearTimeout(id);
  }, [notice, fingerprint]);

  const visible =
    notice !== null &&
    fingerprint !== dismissed &&
    fingerprint !== expiredAt &&
    !isNoticeDismissed(notice, browserSessionStorage());

  // Publish the banner's height for the layout offset; clear it when hidden.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const element = ref.current;
    if (!visible || !element) {
      root.style.removeProperty(HEIGHT_VAR);
      return;
    }
    const publish = () => root.style.setProperty(HEIGHT_VAR, `${element.offsetHeight}px`);
    publish();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, [visible]);

  if (!visible || !notice || !fingerprint) return null;

  const Icon = LEVEL_ICONS[notice.level];
  const dismiss = () => {
    rememberNoticeDismissed(notice, browserSessionStorage());
    setDismissed(fingerprint);
  };

  return (
    <div
      ref={ref}
      data-testid="site-notice"
      data-level={notice.level}
      role={notice.level === "outage" ? "alert" : "status"}
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex items-start gap-3 px-4 py-2 text-sm shadow-md",
        LEVEL_STYLES[notice.level],
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words">
        <span className="sr-only">{LEVEL_LABELS[notice.level]}: </span>
        {notice.message}
        {notice.link && (
          <a
            href={notice.link}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="site-notice-link"
            className="ml-2 inline-flex items-center gap-1 font-medium underline underline-offset-2"
          >
            More info <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        data-testid="site-notice-dismiss"
        className="-my-1 shrink-0 rounded p-1 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
