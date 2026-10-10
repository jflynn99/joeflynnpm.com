"use client";

import { useState, useMemo, useEffect } from "react";

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

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

export function HabitHeatmap() {
  const [data, setData] = useState<Record<number, HabitData>>({});
  const [selectedHabit, setSelectedHabit] = useState("Sleep quality");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    value: string;
    x: number;
    y: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data for available years
  useEffect(() => {
    const loadYearData = async () => {
      setLoading(true);
      const yearsToLoad = [2024, 2025, 2026];
      const loadedData: Record<number, HabitData> = {};

      await Promise.all(
        yearsToLoad.map(async (year) => {
          try {
            const response = await fetch(`/data/habits-${year}.json`);
            if (response.ok) {
              loadedData[year] = await response.json();
            }
          } catch {
            // Year data not available
          }
        })
      );

      setData(loadedData);
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
        return interpolateColor("#1a1a1a", config.color, intensity);
      }
      return config.color;
    }

    if (config.type === "numeric") {
      const num = parseFloat(value);
      if (isNaN(num) || num === 0) return "var(--card)";
      const intensity = Math.min(num / (config.max || 1), 1);
      return interpolateColor("#1a1a1a", config.color, intensity);
    }

    if (config.type === "categorical") {
      return value && value !== "No" ? config.color : "var(--card)";
    }

    if (config.type === "duration") {
      const hours = parseDuration(value);
      if (hours === 0) return "var(--card)";
      const intensity = Math.min(hours / (config.max || 10), 1);
      return interpolateColor("#1a1a1a", config.color, intensity);
    }

    return "var(--card)";
  };

  // Get tooltip content
  const getTooltipContent = (dateKey: string) => {
    const dayData = parsedData[dateKey];
    const config = habitConfig[selectedHabit];

    const date = new Date(dateKey + "T12:00:00");
    const dateStr = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
              onClick={() => setSelectedHabit(key)}
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
      {stats && hasData && (
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
                    className="h-3 w-3 cursor-pointer rounded-[2px] transition-transform hover:z-10 hover:scale-[1.4] hover:shadow-lg"
                    style={{
                      backgroundColor: getDayColor(day.dateKey, day.inYear),
                    }}
                    onMouseEnter={(e) => {
                      if (day.inYear) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const tooltip = getTooltipContent(day.dateKey);
                        setHoveredDay({
                          ...tooltip,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Less</span>
          <div
            className="h-3 w-24 rounded"
            style={{
              background: `linear-gradient(to right, var(--card), ${habitConfig[selectedHabit]?.color || "#c084fc"})`,
            }}
          />
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="pointer-events-none fixed z-50 max-w-[280px] rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm"
          style={{
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y - 10}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="mb-1 text-sm font-semibold"
            style={{ color: habitConfig[selectedHabit]?.color }}
          >
            {hoveredDay.date}
          </div>
          <div className="text-sm text-foreground">
            {habitConfig[selectedHabit]?.label}: {hoveredDay.value}
          </div>
        </div>
      )}
    </div>
  );
}
