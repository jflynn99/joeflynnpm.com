import { createElement } from "react";

type Segment = { text: string; className?: string };

interface WeightRampTitleProps {
  /** The title text. Pass a plain string, or segments to colour parts of it. */
  text: string | Segment[];
  /** Weight of the first letter (heaviest). Inter supports 100–900. */
  from?: number;
  /** Weight of the last letter (lightest). */
  to?: number;
  /** Which element to render. Defaults to a span. */
  as?: keyof JSX.IntrinsicElements;
  /** Extra classes (sizing, tracking, etc.) for the wrapper. */
  className?: string;
}

/**
 * Renders a title where each letter is a step lighter than the previous one,
 * producing a thick-to-thin "weight ramp". The weight is interpolated linearly
 * across every character, so it works for any length of text.
 *
 * Each letter is its own <span> (there's no CSS way to target the Nth letter).
 * The spans are hidden from assistive tech via aria-hidden, and the real text
 * is exposed once through aria-label so screen readers and copy/paste behave.
 */
export function WeightRampTitle({
  text,
  from = 800,
  to = 300,
  as = "span",
  className = "",
}: WeightRampTitleProps) {
  const segments: Segment[] = typeof text === "string" ? [{ text }] : text;
  const plain = segments.map((s) => s.text).join("");
  const chars = Array.from(plain);
  const total = chars.length;

  const weightFor = (index: number) =>
    total <= 1 ? from : Math.round(from + (to - from) * (index / (total - 1)));

  let globalIndex = 0;
  const rendered = segments.map((seg, si) =>
    Array.from(seg.text).map((char, ci) => {
      const weight = weightFor(globalIndex++);
      return (
        <span
          key={`${si}-${ci}`}
          className={seg.className}
          style={{ fontWeight: weight }}
          aria-hidden="true"
        >
          {char}
        </span>
      );
    })
  );

  return createElement(
    as,
    { className: `font-display ${className}`.trim(), "aria-label": plain },
    rendered
  );
}
