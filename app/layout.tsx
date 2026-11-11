import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Header, Footer } from "@/components/layout";
import "./globals.css";

// Variable font (continuous weight axis 100–900) used only for the
// weight-ramp titles. Body text keeps the system font stack from globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const SITE_DESCRIPTION =
  "Senior PM working on AI at Amex GBT, based near Liverpool. I write about AI, books, and whatever I've built lately.";

export const metadata: Metadata = {
  metadataBase: new URL("https://joeflynnpm.com"),
  title: {
    default: "Joe Flynn",
    template: "%s | Joe Flynn",
  },
  description: SITE_DESCRIPTION,
  keywords: ["product management", "AI", "technology", "blog", "portfolio"],
  authors: [{ name: "Joe Flynn" }],
  creator: "Joe Flynn",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://joeflynnpm.com",
    siteName: "Joe Flynn",
    title: "Joe Flynn",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Joe Flynn",
    description: SITE_DESCRIPTION,
    site: "@AiBabysteps",
    creator: "@AiBabysteps",
  },
  alternates: {
    // "./" resolves against each page's own path, so every route gets a
    // self-referencing canonical without repeating it per page.
    canonical: "./",
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "Joe Flynn" }],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 py-8 sm:py-12">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
