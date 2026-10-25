import { createHash } from "crypto";
import { render, PeleError } from "pele";

// Same stack as --font-sans in globals.css. Pele sizes nodes by measuring
// labels in this font, so it must match the font the page actually shows.
const FONT_FAMILY =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// The blog column (max-w-2xl) and a phone column (375px minus gutters).
const WIDE_MAX = 672;
const NARROW_MAX = 340;

export interface MermaidDiagram {
  /** Layout for the full-width column. */
  wide: { svg: string; width: number };
  /** Phone layout, only when Pele laid it out differently (e.g. LR → TD). */
  narrow?: { svg: string; width: number };
}

/**
 * Render Mermaid source to SVG at build time. Returns null on bad syntax so
 * the caller can fall back to showing the code block instead of failing.
 */
export function renderMermaid(source: string): MermaidDiagram | null {
  // Unique per diagram so marker/gradient ids don't clash on one page
  const id = createHash("sha1").update(source).digest("hex").slice(0, 8);

  try {
    const wide = render(source, {
      fontFamily: FONT_FAMILY,
      maxWidth: WIDE_MAX,
      idPrefix: `m${id}-`,
    });
    const narrow = render(source, {
      fontFamily: FONT_FAMILY,
      maxWidth: NARROW_MAX,
      idPrefix: `m${id}n-`,
    });

    return {
      wide: { svg: wide.svg, width: wide.width },
      narrow:
        narrow.width !== wide.width
          ? { svg: narrow.svg, width: narrow.width }
          : undefined,
    };
  } catch (error) {
    if (!(error instanceof PeleError)) throw error;
    const where = error.line ? ` (line ${error.line})` : "";
    console.warn(
      `[mermaid] ${error.code}${where}: ${error.message.split("\n")[0]} — showing the code block instead`
    );
    return null;
  }
}
