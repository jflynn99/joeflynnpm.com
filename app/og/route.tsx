import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Shared social card renderer.
 *
 * Pages opt in by setting `ogCard: true` in their frontmatter; their
 * generateMetadata then points og:image at this route. Nothing is stored
 * in the repo — Vercel renders each card on demand when a scraper asks
 * for it, so a design change here restyles every card at once.
 *
 * Query params:
 *   title  (required) headline
 *   kicker (required) small label above the title, e.g. "BOOK REVIEW"
 *   sub    optional lines under the rule, separated by "|"
 *   img    optional site-relative image shown on the right, e.g. a cover
 */

// The site's OKLCH tokens from globals.css, resolved to sRGB. Satori has no
// OKLCH support, so these are the same colours stated in a form it accepts.
const COLORS = {
  bg: "#110f0e", // --background  oklch(0.17 0.004 70)
  accent: "#fd9a00", // --accent      oklch(0.77 0.185 70)
  fg: "#fbfaf8", // --foreground  oklch(0.985 0.003 70)
  muted: "#a5a19c", // --muted       oklch(0.71 0.008 70)
};

const SIZE = { width: 1200, height: 630 };

/** Longer titles step down a size so three lines always fit the card. */
function titleSize(title: string): number {
  if (title.length > 78) return 44;
  if (title.length > 52) return 52;
  if (title.length > 30) return 60;
  return 68;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const title = searchParams.get("title")?.slice(0, 160) || "joeflynnpm.com";
  const kicker = searchParams.get("kicker")?.slice(0, 40) || "";
  const sub = (searchParams.get("sub") || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const img = searchParams.get("img");

  const [regular, bold] = await Promise.all([
    fetch(new URL("../../assets/fonts/Inter-Regular.ttf", import.meta.url)).then((r) =>
      r.arrayBuffer()
    ),
    fetch(new URL("../../assets/fonts/Inter-Bold.ttf", import.meta.url)).then((r) =>
      r.arrayBuffer()
    ),
  ]);

  // Only same-origin paths are rendered, so the card can never be pointed at
  // an arbitrary remote image by editing the query string.
  const imageUrl = img && img.startsWith("/") ? `${origin}${img}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.bg,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", height: 6, backgroundColor: COLORS.accent }} />

        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 80px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              paddingRight: imageUrl ? 48 : 0,
            }}
          >
            {kicker ? (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: COLORS.accent,
                  marginBottom: 24,
                }}
              >
                {kicker}
              </div>
            ) : null}

            <div
              style={{
                fontSize: titleSize(title),
                fontWeight: 700,
                color: COLORS.fg,
                lineHeight: 1.15,
              }}
            >
              {title}
            </div>

            {sub.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
                <div
                  style={{
                    display: "flex",
                    width: 72,
                    height: 3,
                    backgroundColor: COLORS.accent,
                    marginBottom: 24,
                  }}
                />
                {sub.map((line) => (
                  <div key={line} style={{ fontSize: 27, color: COLORS.muted, lineHeight: 1.4 }}>
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {imageUrl ? (
            <div style={{ display: "flex", width: 320, justifyContent: "flex-end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                style={{ maxWidth: 320, maxHeight: 440, objectFit: "contain" }}
              />
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", padding: "0 80px 40px" }}>
          <div style={{ fontSize: 22, color: COLORS.muted, opacity: 0.75 }}>joeflynnpm.com</div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
    }
  );
}
