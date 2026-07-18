import { flushSync } from "react-dom";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

/**
 * Run a React state update inside a View Transition so the resulting DOM
 * change cross-fades instead of snapping. Falls back to a plain update where
 * the API is unsupported or the user prefers reduced motion.
 *
 * flushSync forces React to commit before the browser captures the "new"
 * snapshot — without it the callback returns before React has re-rendered
 * and the transition animates between two identical frames.
 */
export function withViewTransition(update: () => void) {
  const doc = document as DocumentWithViewTransition;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!doc.startViewTransition || reduceMotion) {
    update();
    return;
  }

  doc.startViewTransition(() => {
    flushSync(update);
  });
}
