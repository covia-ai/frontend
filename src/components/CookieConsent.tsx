"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_CATEGORIES,
  OPEN_CONSENT_DRAWER_EVENT,
  readConsent,
  writeConsent,
  type ConsentCategories,
} from "@/lib/consent";

/**
 * Cookie consent for app.covia.ai / preview.covia.ai.
 *
 * The `covia-consent-v1` pattern shared with covia.ai and docs.covia.ai
 * (D070 §5.1): three categories, a banner on first visit, a preferences
 * drawer that can be reopened from anywhere via
 * `openConsentPreferences()`, and a `covia-consent-change` window event that
 * `lib/analytics` listens to.
 *
 * Replaces the previous binary `react-cookie-consent` banner, which had no
 * categories, no withdrawal route, and stored its decision under the library's
 * placeholder cookie name. Decisions made under that banner are migrated in
 * `lib/consent`, so returning users are not asked twice.
 */

type Mode = "hidden" | "banner" | "drawer";

// `localStorage` access throws in some browsers (notably Safari private
// mode); showing the banner beats crashing the tree.
function safeReadConsent() {
  try {
    return readConsent();
  } catch {
    return null;
  }
}

export const CookieConsentComponent = () => {
  const [mode, setMode] = useState<Mode>("hidden");
  const [categories, setCategories] =
    useState<ConsentCategories>(DEFAULT_CATEGORIES);

  // On mount: show the banner unless a current decision is already stored.
  useEffect(() => {
    const stored = safeReadConsent();
    if (stored) setCategories(stored.categories);
    else setMode("banner");
  }, []);

  // Anything can ask for the drawer — the privacy policy page does.
  useEffect(() => {
    function openDrawer() {
      // Re-read so the drawer always reflects the latest saved state.
      const stored = safeReadConsent();
      if (stored) setCategories(stored.categories);
      setMode("drawer");
    }
    window.addEventListener(OPEN_CONSENT_DRAWER_EVENT, openDrawer);
    return () =>
      window.removeEventListener(OPEN_CONSENT_DRAWER_EVENT, openDrawer);
  }, []);

  // Esc closes the drawer.
  useEffect(() => {
    if (mode !== "drawer") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMode("hidden");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const decide = useCallback((next: ConsentCategories) => {
    writeConsent(next);
    setCategories(next);
    setMode("hidden");
  }, []);

  const acceptAll = useCallback(
    () => decide({ essential: true, analytics: true, marketing: true }),
    [decide],
  );
  const rejectNonEssential = useCallback(
    () => decide({ essential: true, analytics: false, marketing: false }),
    [decide],
  );
  const savePreferences = useCallback(
    () => decide(categories),
    [decide, categories],
  );
  const toggle = useCallback(
    (key: "analytics" | "marketing", value: boolean) =>
      setCategories((prev) => ({ ...prev, [key]: value })),
    [],
  );

  if (mode === "hidden") return null;

  if (mode === "banner") {
    return (
      <div
        id="cookie_consent"
        role="dialog"
        aria-label="Cookie consent"
        aria-live="polite"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card text-card-foreground shadow-lg"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed">
            We use cookies to make Covia work and to understand how the app is
            used. You can change this later from the{" "}
            <a
              href="/privacypolicy"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              privacy policy
            </a>{" "}
            page.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" onClick={acceptAll}>
              Accept All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode("drawer")}
            >
              Customise
            </Button>
            <Button size="sm" variant="outline" onClick={rejectNonEssential}>
              Reject Non-Essential
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setMode("hidden");
      }}
    >
      <div className="w-full max-w-lg rounded-t-lg border border-border bg-card p-5 text-card-foreground shadow-xl sm:rounded-lg">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">Cookie Preferences</h2>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close cookie preferences"
            onClick={() => setMode("hidden")}
            autoFocus
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <CategoryRow
            name="Essential"
            description="Required for the app to work: your venue list, device keys and session state. Stored in your browser only. Cannot be disabled."
            checked
            locked
          />
          <CategoryRow
            name="Analytics"
            description="Helps us understand how the app is used. Loads Google Analytics and PostHog. Declining means neither is loaded at all."
            checked={categories.analytics}
            onChange={(v) => toggle("analytics", v)}
          />
          <CategoryRow
            name="Marketing"
            description="Used to measure campaign effectiveness. Currently unused, and reserved for future retargeting."
            checked={categories.marketing}
            onChange={(v) => toggle("marketing", v)}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={savePreferences}>
            Save Preferences
          </Button>
          <Button size="sm" variant="outline" onClick={rejectNonEssential}>
            Reject Non-Essential
          </Button>
          <Button size="sm" variant="outline" onClick={acceptAll}>
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
};

type CategoryRowProps = {
  name: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (value: boolean) => void;
};

function CategoryRow({
  name,
  description,
  checked,
  locked = false,
  onChange,
}: CategoryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Checkbox
        className="mt-1 shrink-0"
        checked={checked}
        disabled={locked}
        aria-label={`Toggle ${name}`}
        onCheckedChange={(value) => onChange?.(value === true)}
      />
    </div>
  );
}
