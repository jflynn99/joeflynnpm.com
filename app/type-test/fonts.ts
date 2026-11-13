import { Source_Serif_4, Newsreader, Literata } from "next/font/google";

// Imported only by the /type-test route, so no other page loads these fonts.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});
const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

export const fontVariables = [
  sourceSerif.variable,
  newsreader.variable,
  literata.variable,
].join(" ");
