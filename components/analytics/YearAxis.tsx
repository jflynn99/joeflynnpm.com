// The shared year axis for the reading charts over time. A chart lays its
// years out as `grid-template-columns: repeat(n, minmax(0, 1fr))` and puts
// <YearAxis> under it with the same years, so every chart lines up.

/** Every year from the first to the last, so a year with no Books still gets a slot. */
export function yearRange(years: number[]): number[] {
  if (years.length === 0) return [];
  const first = Math.min(...years);
  const last = Math.max(...years);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function yearGridStyle(count: number): React.CSSProperties {
  return { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };
}

export function YearAxis({ years }: { years: number[] }) {
  return (
    <div className="mt-1 grid gap-1 sm:gap-2" style={yearGridStyle(years.length)} aria-hidden>
      {years.map((year) => (
        <span key={year} className="text-center text-xs tabular-nums text-muted">
          <span className="sm:hidden">’{String(year).slice(2)}</span>
          <span className="hidden sm:inline">{year}</span>
        </span>
      ))}
    </div>
  );
}
