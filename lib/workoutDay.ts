// Turns one day's Sessions (from public/data/workouts-<year>.json, built in habit-analysis per
// docs/adr/0001) into what the heatmap draws: the day's Category, brightness step, and card text.
// Kept free of React and path aliases so Node's test runner can load it directly.

export type Category = "Strength" | "Cardio" | "Cycle" | "Mobility" | "Walk" | "Other";

export interface Session {
  activity: string;
  category: Category;
  minutes: number | null;
  timeOfDay: "morning" | "midday" | "evening" | null;
}

export interface DaySummary {
  category: Category | null;
  step: 0 | 1 | 2 | 3 | 4;
  minutesKnown: boolean;
  totalMinutes: number | null;
  /** Lines for the day's card, in display order. */
  lines: string[];
}

// Breaks ties (and days with no minutes) so real sessions beat commute cycling.
export const CATEGORY_PRIORITY: Category[] = ["Strength", "Cardio", "Mobility", "Walk", "Cycle", "Other"];

function stepFor(minutes: number): DaySummary["step"] {
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  if (minutes < 90) return 3;
  return 4;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function sessionLine(session: Session): string {
  return [
    session.activity,
    session.minutes === null ? null : formatMinutes(session.minutes),
    session.timeOfDay,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function summariseDay(sessions: Session[]): DaySummary {
  if (sessions.length === 0) {
    return { category: null, step: 0, minutesKnown: true, totalMinutes: 0, lines: ["Rest day"] };
  }
  const byCategory = new Map<Category, number>();
  for (const session of sessions) {
    byCategory.set(session.category, (byCategory.get(session.category) ?? 0) + (session.minutes ?? 0));
  }
  const [category] = [...byCategory.entries()].sort(
    (a, b) => b[1] - a[1] || CATEGORY_PRIORITY.indexOf(a[0]) - CATEGORY_PRIORITY.indexOf(b[0])
  )[0];
  const sessionLines = sessions.map(sessionLine);
  const minutesKnown = sessions.every((session) => session.minutes !== null);
  if (!minutesKnown) {
    // Tracker-only days record what was done, not for how long: show them at a fixed mid step.
    return {
      category,
      step: 2,
      minutesKnown,
      totalMinutes: null,
      lines: [...sessionLines, "Minutes not recorded"],
    };
  }
  const totalMinutes = sessions.reduce((sum, session) => sum + (session.minutes ?? 0), 0);
  return {
    category,
    step: stepFor(totalMinutes),
    minutesKnown,
    totalMinutes,
    lines: [...sessionLines, `Total ${formatMinutes(totalMinutes)}`],
  };
}
