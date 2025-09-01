import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { CookieConsentComponent } from "@/components/CookieConsent";
import localFont from 'next/font/local';


const { title, description } = siteConfig;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const aetherFont = localFont({
      src: '../../public/fonts/aether.woff2'
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
      <body
        className={`${aetherFont.className} antialiased`}
      >
        {children}
        <CookieConsentComponent />
      </body>
    </html>
  );
}
