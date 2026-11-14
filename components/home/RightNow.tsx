import Link from "next/link";
import type { CurrentRead } from "@/lib/currentReads";
import { CurrentReadList } from "./CurrentReadList";

interface RightNowProps {
  reads: CurrentRead[];
}

// The strip shows Current Reads only. With none, it renders nothing, and the
// neighbouring sections carry their own padding, so no gap is left behind.
export function RightNow({ reads }: RightNowProps) {
  if (reads.length === 0) return null;

  return (
    <section aria-labelledby="right-now" className="pb-4">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="right-now"
          className="text-xs font-semibold uppercase tracking-widest text-muted"
        >
          Right now · Reading
        </h2>
        <Link
          href="/now"
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          More on /now →
        </Link>
      </div>

      <CurrentReadList reads={reads} />
    </section>
  );
}
