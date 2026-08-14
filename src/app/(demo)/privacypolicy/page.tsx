"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { TriangleAlert } from "lucide-react";

// DRAFT pending legal review (frontend#224 — "@chirdeep to supply/approve").
// Reflects what this app actually does today (Google Consent Mode v2
// categories wired in CookieConsent.tsx, device-key storage, venue auth
// flows) as a starting point for review, not published copy.
const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "Introduction",
    body: (
      <p>
        This policy describes how Covia (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        handles information when you use this application. Covia is a
        federated AI orchestration platform: this frontend is a client that
        connects to venue servers you choose, using an SDK that talks
        directly to those venues from your browser.
      </p>
    ),
  },
  {
    heading: "Information we collect",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-foreground">Account &amp; identity data.</span>{" "}
          If you sign in with a device key, an Ed25519 keypair is generated
          in your browser and its private key is stored as hex in your
          browser&rsquo;s localStorage — it is never sent to us. If you sign
          in with OAuth, we receive the bearer token and identity claims the
          venue&rsquo;s auth provider returns.
        </li>
        <li>
          <span className="font-medium text-foreground">Usage data.</span>{" "}
          Page views and product-analytics events, collected via Google Tag
          Manager / Google Analytics, only after you accept analytics
          cookies in the consent banner.
        </li>
        <li>
          <span className="font-medium text-foreground">Venue data.</span>{" "}
          Assets, jobs, and operations you view or create are requested
          directly from the venue server you&rsquo;re connected to — that
          traffic goes to the venue operator, not to us.
        </li>
      </ul>
    ),
  },
  {
    heading: "Cookies & tracking",
    body: (
      <p>
        We use a cookie consent banner backed by{" "}
        <a
          href="https://developers.google.com/tag-platform/security/guides/consent"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Google Consent Mode v2
        </a>
        . Until you accept, analytics and advertising storage are denied by
        default. Accepting grants{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">analytics_storage</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">ad_storage</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">ad_user_data</code>, and{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">ad_personalization</code>{" "}
        consent for that session; declining keeps them denied. You can
        change your choice at any time by clearing the{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">yourAppCookieConsent</code>{" "}
        cookie in your browser settings, which brings the banner back.
      </p>
    ),
  },
  {
    heading: "How we use information",
    body: (
      <p>
        Account and identity data authenticate your requests to venue
        servers. Usage data (only once consented) helps us understand which
        parts of the product are used, so we can prioritize fixes and
        improvements. We do not sell personal data.
      </p>
    ),
  },
  {
    heading: "Third-party services",
    body: (
      <p>
        Google Tag Manager and Google Analytics, governed by Google&rsquo;s
        own privacy terms and the consent settings above. Venue servers you
        connect to are operated by their respective owners — federated
        venues you add are not run by us, and their own privacy practices
        apply to data you send them.
      </p>
    ),
  },
  {
    heading: "Data retention",
    body: (
      <p>
        Device keys and connected-venue configuration live in your
        browser&rsquo;s localStorage until you clear them or sign out.
        Analytics data is retained per Google Analytics&rsquo; standard
        retention settings.
      </p>
    ),
  },
  {
    heading: "Your choices",
    body: (
      <p>
        Decline or withdraw analytics consent at any time via the cookie
        banner. Remove your device key from a browser by signing out and
        clearing site data. Contact us (below) to ask what data we hold
        about you.
      </p>
    ),
  },
  {
    heading: "Security",
    body: (
      <p>
        Device-key private keys never leave your browser. Requests to venue
        servers use the auth method you configured (device-key signature or
        OAuth bearer token) over HTTPS.
      </p>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <p>
        We may update this policy as the product changes. Material changes
        will be reflected with an updated date on this page.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions about this policy: reach us via the{" "}
        <a
          href="https://discord.gg/fywdrKd8QT"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Covia Discord
        </a>{" "}
        or the{" "}
        <a
          href="https://github.com/covia-ai"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Covia GitHub org
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Privacy" highlight="policy" />

        <div className="max-w-3xl space-y-6">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">Draft — pending legal review.</span>{" "}
              This page describes what the product actually does today as a
              starting point; it has not yet been reviewed or approved as
              Covia&rsquo;s published privacy policy.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">Last updated: draft</p>

          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <section key={section.heading} className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold">{section.heading}</h3>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}
