"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  CATEGORIES,
  MINUTE_STEPS,
  summariseDay,
  summariseYear,
  type Category,
  type DaySummary,
  type Session,
  type YearSummary,
} from "@/lib/workoutDay";

// The day card's maximum width in px, shared by its style and the viewport clamp in showDay.
const CARD_MAX_WIDTH = 280;

// Theme tokens from globals.css (see the --workout-* comment there for why Walk and Other match).
const CATEGORY_COLOR: Record<Category, string> = {
  Strength: "var(--workout-strength)",
  Cardio: "var(--workout-cardio)",
  Mobility: "var(--workout-mobility)",
  Cycle: "var(--workout-cycle)",
  Walk: "var(--workout-neutral)",
  Other: "var(--workout-neutral)",
};

// One line per Category for the legend's explainer; the Activities themselves come from the data.
const CATEGORY_BLURB: Record<Category, string> = {
  Strength: "Lifting and bodyweight work.",
  Cardio: "Runs, HIIT, rowing, sport, and anything else that gets the heart going.",
  Cycle: "Every ride, from short commutes to longer lunchtime rides.",
  Mobility: "Yoga and Pilates.",
  Walk: "Everyday movement. Walk minutes count, but a walk only colours a day when nothing else happened.",
  Other: "Gardening, scooting, and sessions the watch couldn't name.",
};

// How strongly each brightness step (0 = Rest Day, then MINUTE_STEPS) shows its Category colour.
const STEP_STRENGTH = [0, 0.35, 0.55, 0.78, 1] as const;

type WorkoutYear = Record<string, Session[]>;

interface HabitData {
  [date: string]: {
    [key: string]: string;
  };
}

interface HabitConfig {
  type: "binary" | "numeric" | "categorical" | "duration";
  column: string;
  yesValue?: string;
  // Binary habits can shade "yes" days by a count column (e.g. drinks), up to max
  countColumn?: string;
  countUnit?: string;
  max?: number;
  color: string;
  label: string;
}

// Parse H:MM:SS or HH:MM:SS format to hours
function parseDuration(value: string): number {
  const parts = value.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  }
  return 0;
}

const habitConfig: Record<string, HabitConfig> = {
  "Sleep quality": {
    type: "numeric",
    column: "Sleep quality",
    max: 5,
    color: "#60a5fa",
    label: "Sleep Quality",
  },
  Workout: {
    type: "categorical",
    column: "Workout",
    color: "#34d399",
    label: "Workout",
  },
  "Coffee count": {
    type: "numeric",
    column: "Coffee count",
    max: 6,
    color: "#f59e0b",
    label: "Coffees",
  },
  "Meditation?": {
    type: "binary",
    column: "Meditation?",
    yesValue: "Yes",
    color: "#06b6d4",
    label: "Meditation",
  },
  "Bedtime reading?": {
    type: "binary",
    column: "Bedtime reading?",
    yesValue: "Yes",
    color: "#8b5cf6",
    label: "Reading",
  },
  "Olive oil?": {
    type: "binary",
    column: "Olive oil?",
    yesValue: "Yes",
    color: "#84cc16",
    label: "Olive Oil",
  },
  Shower: {
    type: "categorical",
    column: "Shower",
    color: "#3b82f6",
    label: "Shower",
  },
  Alcohol: {
    type: "binary",
    column: "Alcohol",
    yesValue: "Yes",
    countColumn: "Alcohol drinks",
    countUnit: "drink",
    max: 10,
    color: "#c084fc",
    label: "Alcohol",
  },
  "Phone time": {
    type: "duration",
    column: "Phone time",
    max: 10, // 10 hours max, so 5 hours is midpoint
    color: "#f43f5e",
    label: "Phone Time",
  },
};

// The Workout Habit draws from the workouts files and summariseDay, not from habitConfig rules.
const WORKOUT = "Workout";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Blends from the theme's card colour towards the Habit colour, so faint days are dark tints
// in dark mode and pale tints in light mode. Resolved by the browser, so it follows theme switches.
function shade(color: string, strength: number): string {
  const pct = Math.round(Math.min(Math.max(strength, 0), 1) * 100);
  return `color-mix(in oklab, ${color} ${pct}%, var(--card))`;
}

export function HabitHeatmap() {
  const [data, setData] = useState<Record<number, HabitData>>({});
  const [workouts, setWorkouts] = useState<Record<number, WorkoutYear>>({});
  // Legend filter for the Workout view: highlights days that include this Category.
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [selectedHabit, setSelectedHabit] = useState("Sleep quality");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openDay, setOpenDay] = useState<{
    dateKey: string;
    date: string;
    value: string;
    workoutDay?: DaySummary;
    x: number;
    y: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPointerType = useRef<string>("mouse");

  // On touch screens a tapped day's card stays open until a tap lands outside the grid's cells,
  // or the page or grid scrolls (the card is fixed-position, so it would drift from its cell).
  const isCardOpen = openDay !== null;
  useEffect(() => {
    if (!isCardOpen) return;
    const close = () => setOpenDay(null);
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-heatmap-cell]")) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", close, { capture: true });
    };
  }, [isCardOpen]);

  // Load data for available years
  useEffect(() => {
    const loadYearData = async () => {
      setLoading(true);
      const yearsToLoad = [2024, 2025, 2026];
      const loadedData: Record<number, HabitData> = {};
      const loadedWorkouts: Record<number, WorkoutYear> = {};

      // Workout Days come from their own files (built in habit-analysis, docs/adr/0001);
      // every other Habit still reads the habits files.
      const load = async <T,>(url: string, into: Record<number, T>, year: number) => {
        try {
          const response = await fetch(url);
          if (response.ok) into[year] = await response.json();
        } catch {
          // Year data not available
        }
      };
      await Promise.all(
        yearsToLoad.flatMap((year) => [
          load(`/data/habits-${year}.json`, loadedData, year),
          load(`/data/workouts-${year}.json`, loadedWorkouts, year),
        ])
      );

      setData(loadedData);
      setWorkouts(loadedWorkouts);
      setLoading(false);

      // Default to most recent year with data
      const loadedYears = Object.keys(loadedData)
        .map(Number)
        .sort((a, b) => b - a);
      if (loadedYears.length > 0) {
        setSelectedYear((current) =>
          loadedData[current] ? current : loadedYears[0]
        );
      }
    };

    loadYearData();
  }, []);

  const parsedData = useMemo(() => data[selectedYear] || {}, [data, selectedYear]);
  const workoutStats = useMemo(() => summariseYear(workouts[selectedYear] || {}), [workouts, selectedYear]);

  // Each Workout Day summarised once per year, shared by the cell colour and the card.
  const workoutDays = useMemo(() => {
    const days = new Map<string, DaySummary>();
    for (const [dateKey, sessions] of Object.entries(workouts[selectedYear] || {})) {
      days.set(dateKey, summariseDay(sessions));
    }
    return days;
  }, [workouts, selectedYear]);

  const availableYears = useMemo(() => {
    return Object.keys(data)
      .map(Number)
      .sort((a, b) => b - a);
  }, [data]);

  // Generate calendar grid for selected year
  const calendarGrid = useMemo(() => {
    const year = selectedYear;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Adjust start to previous Sunday
    const startDay = startDate.getDay();
    const adjustedStart = new Date(startDate);
    adjustedStart.setDate(adjustedStart.getDate() - startDay);

    const weeks: { date: Date; dateKey: string; inYear: boolean }[][] = [];
    const currentDate = new Date(adjustedStart);

    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      const week: { date: Date; dateKey: string; inYear: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
        week.push({
          date: new Date(currentDate),
          dateKey,
          inYear: currentDate.getFullYear() === year,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
      if (currentDate > endDate && currentDate.getDay() === 0) break;
    }

    return weeks;
  }, [selectedYear]);

  // Get color intensity for a day
  const getDayColor = (dateKey: string, inYear: boolean): string => {
    if (!inYear) return "transparent";

    if (selectedHabit === WORKOUT) {
      const day = workoutDays.get(dateKey);
      return day?.category ? shade(CATEGORY_COLOR[day.category], STEP_STRENGTH[day.step]) : "var(--card)";
    }

    const config = habitConfig[selectedHabit];
    if (!config) return "var(--card)";

    const dayData = parsedData[dateKey];
    if (!dayData) return "var(--card)";

    const value = dayData[config.column];
    if (!value || value === "") return "var(--card)";

    if (config.type === "binary") {
      const isYes =
        value === config.yesValue || value.toLowerCase().startsWith("yes");
      if (!isYes) return "var(--card)";
      if (config.countColumn) {
        // Counts only logged since early 2026; uncounted yes days get a mid tone
        const n = parseFloat(dayData[config.countColumn] ?? "");
        const intensity =
          n > 0 ? 0.2 + 0.8 * Math.min(n / (config.max || 1), 1) : 0.5;
        return shade(config.color, intensity);
      }
      return config.color;
    }

    if (config.type === "numeric") {
      const num = parseFloat(value);
      if (isNaN(num) || num === 0) return "var(--card)";
      const intensity = Math.min(num / (config.max || 1), 1);
      return shade(config.color, intensity);
    }

    if (config.type === "categorical") {
      return value && value !== "No" ? config.color : "var(--card)";
    }

    if (config.type === "duration") {
      const hours = parseDuration(value);
      if (hours === 0) return "var(--card)";
      const intensity = Math.min(hours / (config.max || 10), 1);
      return shade(config.color, intensity);
    }

    return "var(--card)";
  };

  // With a Category selected in the Workout legend, days without a Session in it fade back.
  const isFilteredOut = (dateKey: string): boolean =>
    selectedHabit === WORKOUT &&
    activeCategory !== null &&
    !workoutDays.get(dateKey)?.categories.includes(activeCategory);

  // Get tooltip content
  const getTooltipContent = (
    dateKey: string
  ): { date: string; value: string; workoutDay?: DaySummary } => {
    const dayData = parsedData[dateKey];
    const config = habitConfig[selectedHabit];

    const date = new Date(dateKey + "T12:00:00");
    const dateStr = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (selectedHabit === WORKOUT) {
      const workoutDay = workoutDays.get(dateKey);
      return workoutDay ? { date: dateStr, value: "", workoutDay } : { date: dateStr, value: "No data" };
    }

    if (!dayData) return { date: dateStr, value: "No data" };

    const value = dayData[config.column];
    let displayValue = value || "No data";

    if (config.type === "numeric" && value) {
      if (config.label === "Sleep Quality") {
        displayValue = `${value}/5`;
      } else {
        displayValue = value;
      }
    }

    if (config.type === "binary" && config.countColumn && value === "Yes") {
      const n = parseFloat(dayData[config.countColumn] ?? "");
      if (n > 0) {
        displayValue = `Yes · ${n} ${config.countUnit}${n === 1 ? "" : "s"}`;
      }
    }

    if (config.type === "duration" && value) {
      const hours = parseDuration(value);
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      displayValue = `${h}h ${m}m`;
    }

    return { date: dateStr, value: displayValue };
  };

  // Opens a day's card above its cell, kept inside the viewport so it isn't cut off on phones.
  const showDay = (cell: Element, dateKey: string, inYear: boolean) => {
    if (!inYear) return;
    const rect = cell.getBoundingClientRect();
    const halfCard = CARD_MAX_WIDTH / 2;
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, halfCard + 8),
      window.innerWidth - halfCard - 8
    );
    setOpenDay({ dateKey, ...getTooltipContent(dateKey), x, y: rect.top });
  };

  // Get month labels with positions
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIdx: number }[] = [];
    let currentMonth = -1;

    calendarGrid.forEach((week, weekIdx) => {
      week.forEach((day) => {
        if (day.inYear && day.date.getMonth() !== currentMonth) {
          currentMonth = day.date.getMonth();
          labels.push({
            month: day.date.toLocaleDateString("en-GB", { month: "short" }),
            weekIdx,
          });
        }
      });
    });

    return labels;
  }, [calendarGrid]);

  // Calculate stats
  const stats = useMemo(() => {
    const config = habitConfig[selectedHabit];
    if (!config) return null;

    let total = 0;
    let count = 0;
    let daysWithData = 0;

    Object.entries(parsedData).forEach(([dateKey, dayData]) => {
      if (!dateKey.startsWith(String(selectedYear))) return;

      const value = dayData[config.column];
      if (!value || value === "") return;

      daysWithData++;

      if (config.type === "binary") {
        const isYes =
          value === config.yesValue || value.toLowerCase().startsWith("yes");
        if (isYes) count++;
        total++;
      } else if (config.type === "numeric") {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          count += num;
          total++;
        }
      } else if (config.type === "categorical") {
        if (value && value !== "No") count++;
        total++;
      } else if (config.type === "duration") {
        const hours = parseDuration(value);
        if (hours > 0) {
          count += hours;
          total++;
        }
      }
    });

    return {
      daysTracked: daysWithData,
      count,
      total,
      average: total > 0 ? (count / total).toFixed(2) : "0",
      type: config.type,
    };
  }, [parsedData, selectedHabit, selectedYear]);

  const hasData = Object.keys(parsedData).length > 0;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted">Loading habit data...</p>
      </div>
    );
  }

  if (!hasData && availableYears.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted">No habit data available yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Data will appear here once it&apos;s been added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {/* Year selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setActiveCategory(null);
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {(availableYears.length > 0
                ? availableYears
                : [new Date().getFullYear()]
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Habit buttons */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(habitConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedHabit(key);
                setActiveCategory(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedHabit === key
                  ? "scale-105 shadow-md"
                  : "hover:-translate-y-0.5 hover:shadow"
              }`}
              style={{
                backgroundColor:
                  selectedHabit === key ? `${config.color}30` : "var(--card)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor:
                  selectedHabit === key ? config.color : "var(--border)",
                color: selectedHabit === key ? config.color : "var(--muted)",
              }}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {selectedHabit === WORKOUT && workoutStats.recordedDays > 0 && (
        <WorkoutStatsPanel stats={workoutStats} />
      )}
      {selectedHabit !== WORKOUT && stats && hasData && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Days Tracked
              </div>
              <div
                className="text-2xl font-semibold"
                style={{ color: habitConfig[selectedHabit]?.color }}
              >
                {stats.daysTracked}
              </div>
            </div>
            {stats.type === "binary" && (
              <>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Yes Days
                  </div>
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: habitConfig[selectedHabit]?.color }}
                  >
                    {stats.count}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Rate
                  </div>
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: habitConfig[selectedHabit]?.color }}
                  >
                    {(parseFloat(stats.average) * 100).toFixed(0)}%
                  </div>
                </div>
              </>
            )}
            {stats.type === "numeric" && (
              <>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total
                  </div>
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: habitConfig[selectedHabit]?.color }}
                  >
                    {stats.count}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Daily Avg
                  </div>
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: habitConfig[selectedHabit]?.color }}
                  >
                    {stats.average}
                  </div>
                </div>
              </>
            )}
            {stats.type === "categorical" && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Days
                </div>
                <div
                  className="text-2xl font-semibold"
                  style={{ color: habitConfig[selectedHabit]?.color }}
                >
                  {stats.count}
                </div>
              </div>
            )}
            {stats.type === "duration" && (
              <>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Hours
                  </div>
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: habitConfig[selectedHabit]?.color }}
                  >
                    {Math.round(stats.count)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Daily Avg
                  </div>
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: habitConfig[selectedHabit]?.color }}
                  >
                    {(() => {
                      const avg = parseFloat(stats.average);
                      const h = Math.floor(avg);
                      const m = Math.round((avg - h) * 60);
                      return `${h}h ${m}m`;
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="relative overflow-x-auto rounded-lg border border-border bg-card p-4">
        {/* Month labels */}
        <div className="relative mb-2 ml-9 h-4">
          {monthLabels.map((label, idx) => (
            <span
              key={idx}
              className="absolute text-xs text-muted-foreground"
              style={{ left: `${label.weekIdx * 14}px` }}
            >
              {label.month}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Day labels */}
          <div className="mr-2 flex flex-col gap-[2px]">
            {dayLabels.map((day, idx) => (
              <div
                key={day}
                className="flex h-3 items-center text-[10px] text-muted-foreground"
                style={{ visibility: idx % 2 === 1 ? "visible" : "hidden" }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="flex gap-[2px]">
            {calendarGrid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    // Only real days count as cells; a tap on padding outside the year closes the card.
                    data-heatmap-cell={day.inYear || undefined}
                    className="h-3 w-3 cursor-pointer rounded-[2px] transition-transform hover:z-10 hover:scale-[1.4] hover:shadow-lg"
                    style={{
                      backgroundColor: getDayColor(day.dateKey, day.inYear),
                      opacity: isFilteredOut(day.dateKey) ? 0.2 : undefined,
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") showDay(e.currentTarget, day.dateKey, day.inYear);
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") setOpenDay(null);
                    }}
                    onPointerDown={(e) => {
                      lastPointerType.current = e.pointerType;
                    }}
                    onClick={(e) => {
                      // Mouse users already see the card on hover; a tap toggles it. The pointer
                      // type comes from pointerdown because not every browser's click event has one.
                      if (lastPointerType.current === "mouse") return;
                      if (openDay?.dateKey === day.dateKey) setOpenDay(null);
                      else showDay(e.currentTarget, day.dateKey, day.inYear);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        {selectedHabit === WORKOUT ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div role="group" aria-label="Show days that include a Category" className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((category) => {
                const active = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(active ? null : category)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      active
                        ? "border-foreground bg-card-hover text-foreground"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{ backgroundColor: CATEGORY_COLOR[category] }}
                    />
                    {category}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>Minutes</span>
                {MINUTE_STEPS.map((step, i) => (
                  <span key={step.label} className="flex items-center gap-1">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{ backgroundColor: shade("var(--foreground)", STEP_STRENGTH[i + 1]) }}
                    />
                    {step.label}
                  </span>
                ))}
              </div>
              {workoutStats.hasUnknownMinutes && (
                <p className="mt-1">Days logged without minutes use the 20–44m shade.</p>
              )}
            </div>
            <p className="w-full text-xs text-muted" aria-live="polite">
              {activeCategory ? (
                <>
                  <span className="font-medium text-foreground">{activeCategory}:</span>{" "}
                  {CATEGORY_BLURB[activeCategory]}{" "}
                  {workoutStats.activitiesByCategory[activeCategory]?.length ? (
                    <>
                      In {selectedYear}: {workoutStats.activitiesByCategory[activeCategory]!.join(", ")}.
                    </>
                  ) : (
                    <>Nothing logged in {selectedYear}.</>
                  )}
                </>
              ) : (
                "Click a Category to highlight its days and see what it covers."
              )}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Less</span>
            <div
              className="h-3 w-24 rounded"
              style={{
                background: `linear-gradient(in oklab to right, var(--card), ${habitConfig[selectedHabit]?.color || "#c084fc"})`,
              }}
            />
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {openDay && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm"
          style={{
            maxWidth: `${CARD_MAX_WIDTH}px`,
            left: `${openDay.x}px`,
            top: `${openDay.y - 10}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="mb-1 text-sm font-semibold"
            style={{ color: habitConfig[selectedHabit]?.color }}
          >
            {openDay.date}
          </div>
          {openDay.workoutDay ? (
            <div className="space-y-0.5 text-sm">
              {openDay.workoutDay.lines.length > 0 && (
                <ul className="space-y-0.5 text-foreground">
                  {openDay.workoutDay.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
              <div className={openDay.workoutDay.lines.length > 0 ? "text-muted" : "text-foreground"}>
                {openDay.workoutDay.footer}
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground">
              {habitConfig[selectedHabit]?.label}: {openDay.value}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The year at a glance for the Workout view: headline numbers, then what the minutes were spent on.
function WorkoutStatsPanel({ stats }: { stats: YearSummary }) {
  const mix = CATEGORIES.map((category) => ({
    category,
    minutes: stats.minutesByCategory[category] ?? 0,
  })).filter((part) => part.minutes > 0);
  const share = (minutes: number) => Math.round((100 * minutes) / (stats.totalMinutes || 1));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap gap-6">
        {[
          ["Workout Days", stats.workoutDays.toLocaleString()],
          // Session Days leave out walk-only days: walks are everyday movement, not the day's activity.
          ["Session Days", `${stats.sessionDays.toLocaleString()} · ${Math.round(stats.sessionDayRate * 100)}%`],
          ["Total Hours", Math.round(stats.totalMinutes / 60).toLocaleString()],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {mix.length > 0 && (
        <div className="mt-4">
          <div
            className="flex h-2.5 gap-[2px] overflow-hidden rounded-full"
            role="img"
            aria-label={`Minutes by Category: ${mix
              .map((part) => `${part.category} ${share(part.minutes)}%`)
              .join(", ")}`}
          >
            {mix.map((part) => (
              <div
                key={part.category}
                title={`${part.category}: ${share(part.minutes)}%`}
                style={{ flexGrow: part.minutes, backgroundColor: CATEGORY_COLOR[part.category] }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {mix.map((part) => (
              <span key={part.category} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: CATEGORY_COLOR[part.category] }}
                />
                {part.category} <span className="tabular-nums text-foreground">{share(part.minutes)}%</span>
              </span>
            ))}
          </div>
          {stats.hasUnknownMinutes && (
            <p className="mt-2 text-xs text-muted-foreground">
              Hours and the mix count Fitbit minutes only. Days logged in the Tracker alone have no
              minutes, so they count as Workout Days but not towards the hours.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
