// The Fiction / Non-fiction colours and legend swatch shared by the reading charts.

export const FICTION = "var(--reading-fiction)";
export const NON_FICTION = "var(--reading-nonfiction)";

export function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
