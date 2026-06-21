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

export const metadata: Metadata = {
  metadataBase: new URL("https://joeflynnpm.com"),
  title: {
    default: "Joe Flynn",
    template: "%s | Joe Flynn",
  },
  description:
    "Personal website of Joe Flynn - thoughts on product management, AI, and technology.",
  keywords: ["product management", "AI", "technology", "blog", "portfolio"],
  authors: [{ name: "Joe Flynn" }],
  creator: "Joe Flynn",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://joeflynnpm.com",
    siteName: "Joe Flynn",
    title: "Joe Flynn",
    description:
      "Personal website of Joe Flynn - thoughts on product management, AI, and technology.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Joe Flynn",
    description:
      "Personal website of Joe Flynn - thoughts on product management, AI, and technology.",
    creator: "@joeflynn",
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
