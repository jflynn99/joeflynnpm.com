import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OWID Explorer",
    template: "%s · OWID Explorer",
  },
  description:
    "Explore, combine and explain Our World in Data — interactive charts, overlays, and an optional bring-your-own-LLM agent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              OWID <span className="text-blue-600">Explorer</span>
            </Link>
            <a
              href="https://ourworldindata.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Data: Our World in Data
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-gray-400">
          Charts rendered independently from OWID&apos;s public APIs. OWID content is CC BY;
          underlying third-party data may carry its own terms.
        </footer>
      </body>
    </html>
  );
}
