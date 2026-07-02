"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SearchChartResult, SearchResponse } from "@/lib/owid/types";

export default function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchChartResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/owid/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data: SearchResponse = await res.json();
        const charts = data.results.filter(
          (r): r is SearchChartResult => r.type === "chart"
        );
        setResults(charts.slice(0, 8));
        setOpen(true);
      } catch {
        // aborted or failed — leave previous results
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search OWID charts — try “life expectancy”"
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && results.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-400">Searching…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-400">No charts found</li>
          )}
          {results.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/chart/${r.slug}`}
                className="block px-4 py-2 text-sm hover:bg-blue-50"
                onClick={() => setOpen(false)}
              >
                <span className="font-medium">{r.title}</span>
                {r.variantName && <span className="ml-1 text-gray-400">({r.variantName})</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
