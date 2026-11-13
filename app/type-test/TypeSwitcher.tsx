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
      {/* Pinned to the bottom of the viewport, so the face can be switched mid-post. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 py-3 sm:px-6"
        role="group"
        aria-label="Typeface"
      >
        <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
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
        <label className="mx-auto mt-3 flex max-w-2xl items-center gap-2 text-sm text-muted">
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
        className={`${styles.body} prose prose-lg max-w-none pb-40`}
        data-face={face}
        data-tuned={tuned}
      >
        {children}
      </div>
    </>
  );
}
