import Link from "next/link";
import Image from "next/image";
import { formatStarted, type CurrentRead } from "@/lib/currentReads";

interface RightNowProps {
  reads: CurrentRead[];
}

export function RightNow({ reads }: RightNowProps) {
  if (reads.length === 0) return null;

  return (
    <section aria-labelledby="right-now" className="pb-4">
      <h2
        id="right-now"
        className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted"
      >
        Right now · Reading
      </h2>

      <ul className="grid gap-4 sm:grid-cols-2">
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
    </section>
  );
}
