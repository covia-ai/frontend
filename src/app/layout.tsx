import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { CookieConsentComponent } from "@/components/CookieConsent";
import localFont from 'next/font/local';
import { GoogleTagManager } from '@next/third-parties/google'
import { ThemeProvider } from "@/components/ThemeProvider";
import PageViewTracker from "@/components/PageViewTracker";


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
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`,
          }}
        />
      </head>
      <body
        className={`${aetherFont.className}  antialiased`}
      >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >{children}

          </ThemeProvider>

        <CookieConsentComponent />
        <PageViewTracker />
        <GoogleTagManager gtmId="GTM-K5CKZL5G" />
      </body>
    </html>
  );
}
