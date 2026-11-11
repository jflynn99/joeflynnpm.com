import Link from "next/link";
import Image from "next/image";
import { formatStarted, type CurrentRead } from "@/lib/currentReads";
import { formatAsOf, type YearSoFar } from "@/lib/yearSoFar";

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
      <h2
        id="right-now"
        className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted"
      >
        Right now{reads.length > 0 && " · Reading"}
      </h2>

      {reads.length > 0 && (
        <ul className="mb-4 grid gap-4 sm:grid-cols-2">
          {reads.map((read) => (
            <li
              key={`${read.title}|${read.author}`}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-3"
            >
              {read.coverImage && (
                <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded bg-background">
                  <Image
                    src={read.coverImage}
                    alt={`Cover of ${read.title}`}
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized // matches BookCard: covers are served as-is
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{read.title}</p>
                <p className="text-sm text-muted">{read.author}</p>
                {read.started && (
                  <p className="text-xs text-muted">Started {formatStarted(read.started)}</p>
                )}
                {read.relatedReview && (
                  <Link
                    href={read.relatedReview.href}
                    className="mt-1 inline-block text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    My review of {read.relatedReview.title} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

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
