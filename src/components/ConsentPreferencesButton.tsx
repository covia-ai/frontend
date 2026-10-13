"use client";

import { Button } from "@/components/ui/button";
import { openConsentPreferences } from "@/lib/consent";

/** Reopens the cookie-preferences drawer. Its own client component so the
 *  privacy page around it can stay a server component (#473). */
export function ConsentPreferencesButton() {
  return (
    <Button size="sm" variant="outline" onClick={openConsentPreferences}>
      Manage cookie preferences
    </Button>
  );
}
