import Link from "next/link";
import SearchBox from "@/components/search/SearchBox";

// Curated landing set — slugs verified against the live OWID API.
const FEATURED = [
  { slug: "life-expectancy", title: "Life expectancy" },
  { slug: "co-emissions-per-capita", title: "CO₂ emissions per capita" },
  { slug: "gdp-per-capita-worldbank", title: "GDP per capita" },
  { slug: "child-mortality", title: "Child mortality" },
  { slug: "share-electricity-renewables", title: "Share of electricity from renewables" },
  { slug: "population", title: "Population" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center pt-8">
      <h1 className="text-center text-3xl font-bold tracking-tight">
        Explore Our World in Data
      </h1>
      <p className="mt-3 max-w-xl text-center text-gray-500">
        Search thousands of charts, pick countries and time ranges, and share the
        link. Every chart carries OWID&apos;s citations.
      </p>
      <div className="mt-8 w-full max-w-xl">
        <SearchBox autoFocus />
      </div>

      <h2 className="mt-14 self-start text-sm font-semibold uppercase tracking-wide text-gray-400">
        Featured charts
      </h2>
      <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED.map((c) => (
          <Link
            key={c.slug}
            href={`/chart/${c.slug}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow"
          >
            <span className="font-medium">{c.title}</span>
            <span className="mt-1 block text-xs text-gray-400">/{c.slug}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
