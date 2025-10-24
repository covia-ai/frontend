import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { CookieConsentComponent } from "@/components/CookieConsent";
import localFont from 'next/font/local';
import { GoogleAnalytics } from '@next/third-parties/google';
import { ThemeProvider } from "@/components/ThemeProvider";


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
    <html lang="en">
      <body suppressHydrationWarning
        className={`${aetherFont.className}  antialiased`}
      >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >{children}
          </ThemeProvider>
        <CookieConsentComponent />
      </body>
      <GoogleAnalytics gaId="G-CS4QNLYT4M" />
    </html>
  );
}
