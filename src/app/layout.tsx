import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { CookieConsentComponent } from "@/components/CookieConsent";
import localFont from 'next/font/local';
import { ThemeProvider } from "@/components/ThemeProvider";
import PageViewTracker from "@/components/PageViewTracker";
import { Analytics } from "@/components/analytics/Analytics";


const { title, description } = siteConfig;

const aetherFont = localFont({
      src: '../../public/fonts/aether.woff2',
      variable: '--font-aether',
});

export const metadata: Metadata = {
  title: title,
  description: description,
  robots: {
    index: false,
    follow: false,
  },
  other: {
    google: "nositelinkssearchbox",
    "google-translate": "notranslate",
  },
};

export default function RootLayout({
  children,
  
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Consent Mode v2 default, queued before anything can load: GA4 is told
          up front that no storage is permitted. `lib/analytics` sends the
          matching `consent update` once the user grants the analytics
          category. Inline and in <head> because it has to run before gtag.js,
          which `lib/analytics` only injects after a grant (D070 §5.1).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`,
          }}
        />
      </head>
      <body
        className={`${aetherFont.className} ${aetherFont.variable} antialiased`}
      >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >{children}

          </ThemeProvider>

        <CookieConsentComponent />
        <Analytics />
        <PageViewTracker />
      </body>
    </html>
  );
}
