// Turns one day's Sessions (from public/data/workouts-<year>.json, built in habit-analysis per
// docs/adr/0001) into what the heatmap draws: the day's Category, brightness step, and card text.
// Kept free of React and path aliases so Node's test runner can load it directly.

export type Category = "Strength" | "Cardio" | "Cycle" | "Mobility" | "Walk" | "Other";

/** Every Category, in glossary order (the legend and mix bar use this). */
export const CATEGORIES: readonly Category[] = ["Strength", "Cardio", "Cycle", "Mobility", "Walk", "Other"];

/** Brightness steps 1 to 4: a day's total minutes up to (not including) each limit. */
export const MINUTE_STEPS = [
  { below: 20, label: "under 20m" },
  { below: 45, label: "20–44m" },
  { below: 90, label: "45–89m" },
  { below: Infinity, label: "90m+" },
] as const;

export interface Session {
  activity: string;
  category: Category;
  minutes: number | null;
  timeOfDay: "morning" | "midday" | "evening" | null;
}

export interface DaySummary {
  category: Category | null;
  /** Every Category with a Session that day, in first-seen order. */
  categories: Category[];
  step: 0 | 1 | 2 | 3 | 4;
  minutesKnown: boolean;
  totalMinutes: number | null;
  /** One card line per Session, in time order. */
  lines: string[];
  /** The card's closing line: the day's total, "Minutes not recorded", or "Rest day". */
  footer: string;
}

// Breaks ties (and days with no minutes) so real sessions beat commute cycling.
const CATEGORY_PRIORITY: Category[] = ["Strength", "Cardio", "Mobility", "Walk", "Cycle", "Other"];

function stepFor(minutes: number): DaySummary["step"] {
  return (MINUTE_STEPS.findIndex((step) => minutes < step.below) + 1) as DaySummary["step"];
}

function formatMinutes(minutes: number): string {
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
    return { category: null, categories: [], step: 0, minutesKnown: true, totalMinutes: 0, lines: [], footer: "Rest day" };
  }
  // Walks are everyday movement: they count towards the day's minutes, but any other Session
  // (even a short commute cycle) is the day's real activity and sets the colour.
  const colourSessions = sessions.some((session) => session.category !== "Walk")
    ? sessions.filter((session) => session.category !== "Walk")
    : sessions;
  const byCategory = new Map<Category, number>();
  for (const session of colourSessions) {
    byCategory.set(session.category, (byCategory.get(session.category) ?? 0) + (session.minutes ?? 0));
  }
  const [category] = [...byCategory.entries()].sort(
    (a, b) => b[1] - a[1] || CATEGORY_PRIORITY.indexOf(a[0]) - CATEGORY_PRIORITY.indexOf(b[0])
  )[0];
  const categories = [...new Set(sessions.map((session) => session.category))];
  const sessionLines = sessions.map(sessionLine);
  const minutesKnown = sessions.every((session) => session.minutes !== null);
  const unknownCount = sessions.filter((session) => session.minutes === null).length;
  if (unknownCount > 0 && unknownCount < sessions.length) {
    // Fitbit minutes plus Sessions only the Tracker recorded: the known minutes are a floor.
    const knownMinutes = sessions.reduce((sum, session) => sum + (session.minutes ?? 0), 0);
    return {
      category,
      categories,
      step: Math.max(stepFor(knownMinutes), 2) as DaySummary["step"],
      minutesKnown,
      totalMinutes: knownMinutes,
      lines: sessionLines,
      footer: `Total ${formatMinutes(knownMinutes)}, plus ${unknownCount} Session${unknownCount === 1 ? "" : "s"} without minutes`,
    };
  }
  if (!minutesKnown) {
    // Tracker-only days record what was done, not for how long: show them at a fixed mid step.
    return {
      category,
      categories,
      step: 2,
      minutesKnown,
      totalMinutes: null,
      lines: sessionLines,
      footer: "Minutes not recorded",
    };
  }
  const totalMinutes = sessions.reduce((sum, session) => sum + (session.minutes ?? 0), 0);
  return {
    category,
    categories,
    step: stepFor(totalMinutes),
    minutesKnown,
    totalMinutes,
    lines: sessionLines,
    footer: `Total ${formatMinutes(totalMinutes)}`,
  };
}

export interface YearSummary {
  /** Days with at least one Session. */
  workoutDays: number;
  /** Days with any record: Workout Days plus logged Rest Days. */
  recordedDays: number;
  /** Workout Days with at least one Session other than Walk. */
  sessionDays: number;
  /** Session Days as a share of recorded days, 0 to 1. */
  sessionDayRate: number;
  /** Known minutes only; Tracker-only Sessions have none. */
  totalMinutes: number;
  minutesByCategory: Partial<Record<Category, number>>;
  /** The Activities each Category covered this year, most Sessions first. */
  activitiesByCategory: Partial<Record<Category, string[]>>;
  /** True when some Sessions had no recorded minutes, so totals undercount. */
  hasUnknownMinutes: boolean;
}

export function summariseYear(days: Record<string, Session[]>): YearSummary {
  let workoutDays = 0;
  let sessionDays = 0;
  let totalMinutes = 0;
  let hasUnknownMinutes = false;
  const minutesByCategory: Partial<Record<Category, number>> = {};
  const activityCounts = new Map<Category, Map<string, number>>();
  const recorded = Object.values(days);
  for (const sessions of recorded) {
    if (sessions.length > 0) workoutDays++;
    if (sessions.some((session) => session.category !== "Walk")) sessionDays++;
    for (const session of sessions) {
      const counts = activityCounts.get(session.category) ?? new Map<string, number>();
      counts.set(session.activity, (counts.get(session.activity) ?? 0) + 1);
      activityCounts.set(session.category, counts);
      if (session.minutes === null) {
        hasUnknownMinutes = true;
        continue;
      }
      totalMinutes += session.minutes;
      minutesByCategory[session.category] = (minutesByCategory[session.category] ?? 0) + session.minutes;
    }
  }
  return {
    workoutDays,
    recordedDays: recorded.length,
    sessionDays,
    sessionDayRate: recorded.length > 0 ? sessionDays / recorded.length : 0,
    totalMinutes,
    minutesByCategory,
    activitiesByCategory: Object.fromEntries(
      [...activityCounts].map(([category, counts]) => [
        category,
        // Stable sort keeps first-seen order for equal counts.
        [...counts].sort((a, b) => b[1] - a[1]).map(([activity]) => activity),
      ])
    ),
    hasUnknownMinutes,
  };
}
