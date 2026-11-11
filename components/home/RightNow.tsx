import Link from "next/link";
import type { CurrentRead } from "@/lib/currentReads";
import { formatAsOf, type YearSoFar } from "@/lib/yearSoFar";
import { CurrentReadList } from "./CurrentReadList";

/** One year-so-far figure and the part of /analytics it links to. */
interface YearStat {
  value: number;
  label: string;
  href: string;
  /** How fresh the figure is, for data that can lag (Session Days). */
  note?: string;
}

interface RightNowProps {
  reads: CurrentRead[];
  yearSoFar: YearSoFar;
}

// The strip always shows: with no Current Reads it still carries the year so far (0s in January).
export function RightNow({ reads, yearSoFar }: RightNowProps) {
  const { year, books, pages, sessionDays } = yearSoFar;
  const stats: YearStat[] = [
    { value: books, label: books === 1 ? "Book finished" : "Books finished", href: "/analytics#reading" },
    { value: pages, label: "pages read", href: "/analytics#reading" },
    ...(sessionDays
      ? [
          {
            value: sessionDays.count,
            label: sessionDays.count === 1 ? "Session Day" : "Session Days",
            note: `as of ${formatAsOf(sessionDays.asOf)}`,
            href: "/analytics#workouts",
          },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="right-now" className="pb-4">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="right-now"
          className="text-xs font-semibold uppercase tracking-widest text-muted"
        >
          Right now{reads.length > 0 && " · Reading"}
        </h2>
        <Link
          href="/now"
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          More on /now →
        </Link>
      </div>

      <CurrentReadList reads={reads} className="mb-4" />

      <div>
        <h3 className="mb-2 text-xs text-muted">{year} so far</h3>
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {stats.map((stat) => (
            <li key={stat.label}>
              <Link href={stat.href} className="group block">
                <span className="text-2xl font-semibold tabular-nums group-hover:text-accent transition-colors">
                  {stat.value.toLocaleString("en-GB")}
                </span>{" "}
                <span className="text-sm text-muted">{stat.label}</span>
                {stat.note && (
                  <span className="block text-xs text-muted">{stat.note}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
