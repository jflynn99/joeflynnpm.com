"use client";

import { useState, type ReactNode } from "react";
import styles from "./type-test.module.css";

const FACES = [
  { id: "system", label: "System (current)" },
  { id: "source-serif", label: "Source Serif 4" },
  { id: "newsreader", label: "Newsreader" },
  { id: "literata", label: "Literata" },
] as const;

type Face = (typeof FACES)[number]["id"];

/** Holds the switcher state; the MDX body arrives as server-rendered children. */
export function TypeSwitcher({ children }: { children: ReactNode }) {
  const [face, setFace] = useState<Face>("system");
  const [tuned, setTuned] = useState(false);

  return (
    <>
      <div
        className="sticky top-0 z-10 -mx-4 mb-8 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6"
        role="group"
        aria-label="Typeface"
      >
        <div className="flex flex-wrap gap-2">
          {FACES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFace(f.id)}
              aria-pressed={face === f.id}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                face === f.id
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={tuned}
            onChange={(e) => setTuned(e.target.checked)}
            disabled={face === "system"}
          />
          Tuned size (nudges each serif to match the system font&apos;s apparent size)
        </label>
      </div>
      <div
        className={`${styles.body} prose prose-lg max-w-none`}
        data-face={face}
        data-tuned={tuned}
      >
        {children}
      </div>
    </>
  );
}
