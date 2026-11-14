import { Literata } from "next/font/google";

// Loaded once, and only imported by LongFormBody, so pages without a
// long-form body (home, /analytics, /books) never reference it.
export const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});
