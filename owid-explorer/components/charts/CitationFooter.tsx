import type { ColumnMeta } from "@/lib/owid/types";

// Every chart shows this (SPEC.md §1.4): citation per series, unit, timespan,
// and the CC-BY note.
export default function CitationFooter({
  columns,
  originalChartUrl,
}: {
  columns: ColumnMeta[];
  originalChartUrl?: string;
}) {
  return (
    <footer className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500">
      {columns.map((col) => (
        <div key={col.shortName} className="mb-2">
          {col.descriptionShort && <p className="mb-1 text-gray-600">{col.descriptionShort}</p>}
          <p>
            <span className="font-medium text-gray-600">Source:</span> {col.citationShort}
            {col.unit && <> · Unit: {col.unit}</>}
            {col.timespan && <> · {col.timespan}</>}
          </p>
        </div>
      ))}
      <p>
        Data:{" "}
        {originalChartUrl ? (
          <a href={originalChartUrl} className="underline hover:text-gray-700" target="_blank" rel="noopener noreferrer">
            Our World in Data
          </a>
        ) : (
          "Our World in Data"
        )}{" "}
        (CC BY). Underlying third-party data may carry its own terms.
      </p>
    </footer>
  );
}
