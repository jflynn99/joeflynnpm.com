"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FiveStarPick as Pick } from "@/lib/fiveStarPicks";
import { StarRating } from "./StarRating";

interface FiveStarPickProps {
  picks: Pick[];
}

// The 404 page is static, so the server can only ever render one book. It
// renders the first; the browser swaps in a random one on mount. The card has
// a fixed height, so the swap never moves anything else on the page.
export function FiveStarPick({ picks }: FiveStarPickProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the random pick must wait for the client, or the server and browser would disagree
    setIndex(Math.floor(Math.random() * picks.length));
  }, [picks.length]);

  const pick = picks[index];
  if (!pick) return null;

  return (
    <Link
      href={`/books/${pick.slug}`}
      className="group flex h-36 w-full max-w-sm items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-accent/50 hover:bg-card-hover"
    >
      <div className="relative aspect-[2/3] h-full shrink-0 overflow-hidden rounded bg-background">
        {pick.coverImage && (
          <Image
            src={pick.coverImage}
            alt={`Cover of ${pick.title}`}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized // matches BookCard: covers are served as-is
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {pick.title}
        </p>
        <p className="mt-1 text-sm text-muted line-clamp-1">{pick.author}</p>
        <div className="mt-2">
          <StarRating rating={5} size="sm" />
        </div>
        <p className="mt-2 text-xs text-accent">Read my review →</p>
      </div>
    </Link>
  );
}
