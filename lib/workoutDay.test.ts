import { test } from "node:test";
import assert from "node:assert/strict";
import { summariseDay, summariseYear, type Session } from "./workoutDay.ts";

const s = (
  activity: string,
  category: Session["category"],
  minutes: number | null,
  timeOfDay: Session["timeOfDay"] = null
): Session => ({ activity, category, minutes, timeOfDay });

test("a Workout Day takes the Category with the most minutes, not the most Sessions", () => {
  const day = summariseDay([
    s("Cycle", "Cycle", 12, "morning"),
    s("Weights", "Strength", 45, "midday"),
    s("Cycle", "Cycle", 15, "evening"),
  ]);

  assert.equal(day.category, "Strength");
  assert.equal(day.totalMinutes, 72);
  assert.equal(day.step, 3);
});

test("a tie on minutes goes to the higher-priority Category", () => {
  // Priority: Strength, Cardio, Mobility, Walk, Cycle, Other (Walk only competes on walk-only days)
  assert.equal(summariseDay([s("Cycle", "Cycle", 30), s("Weights", "Strength", 30)]).category, "Strength");
  assert.equal(summariseDay([s("Yoga", "Mobility", 25), s("Run", "Cardio", 25)]).category, "Cardio");
  assert.equal(summariseDay([s("Other", "Other", 20), s("Cycle", "Cycle", 20)]).category, "Cycle");
});

test("a Tracker-only day with no minutes uses the priority order, sits at step 2, and says so", () => {
  const day = summariseDay([s("Cycle", "Cycle", null), s("Weights", "Strength", null)]);

  assert.equal(day.category, "Strength");
  assert.equal(day.step, 2);
  assert.equal(day.minutesKnown, false);
  assert.equal(day.totalMinutes, null);
});

test("brightness steps break at 20, 45, and 90 minutes", () => {
  const stepAt = (minutes: number) => summariseDay([s("Run", "Cardio", minutes)]).step;
  assert.deepEqual(
    [1, 19, 20, 44, 45, 89, 90, 240].map(stepAt),
    [1, 1, 2, 2, 3, 3, 4, 4]
  );
});

test("a Rest Day has no Category and draws as an empty cell", () => {
  const day = summariseDay([]);
  assert.equal(day.category, null);
  assert.equal(day.step, 0);
});

test("the card lists each Session with its minutes and time of day, then the day's total", () => {
  const day = summariseDay([
    s("Cycle", "Cycle", 12, "morning"),
    s("Weights", "Strength", 45, "midday"),
    s("Cycle", "Cycle", 38, "evening"),
  ]);
  assert.deepEqual(day.lines, [
    "Cycle · 12m · morning",
    "Weights · 45m · midday",
    "Cycle · 38m · evening",
  ]);
  assert.equal(day.footer, "Total 1h 35m");
});

test("the card for a Tracker-only day names the Activities and says minutes were not recorded", () => {
  const day = summariseDay([s("HIIT + weights", "Strength", null), s("Cycle", "Cycle", null)]);
  assert.deepEqual(day.lines, ["HIIT + weights", "Cycle"]);
  assert.equal(day.footer, "Minutes not recorded");
});

test("the card for a Rest Day says so", () => {
  const day = summariseDay([]);
  assert.deepEqual(day.lines, []);
  assert.equal(day.footer, "Rest day");
});

test("Walk only sets the colour when nothing else happened, but its minutes still count", () => {
  const day = summariseDay([
    s("Walk", "Walk", 35, "morning"),
    s("Cycle", "Cycle", 10, "morning"),
    s("Walk", "Walk", 50, "evening"),
  ]);
  assert.equal(day.category, "Cycle");
  assert.equal(day.totalMinutes, 95);
  assert.equal(day.step, 4);

  assert.equal(summariseDay([s("Walk", "Walk", 60), s("Walk", "Walk", 30)]).category, "Walk");
  assert.equal(summariseDay([s("Gardening", "Other", 5), s("Walk", "Walk", 80)]).category, "Other");
});

test("a day lists every Category it includes, so filtering finds days a Category didn't dominate", () => {
  const day = summariseDay([
    s("Cycle", "Cycle", 50, "morning"),
    s("Weights", "Strength", 15, "midday"),
    s("Walk", "Walk", 20, "evening"),
    s("Cycle", "Cycle", 12, "evening"),
  ]);
  assert.deepEqual(day.categories, ["Cycle", "Strength", "Walk"]);
  assert.deepEqual(summariseDay([]).categories, []);
});

test("a year rolls up Workout Days, Session Days over recorded days, hours, and minutes by Category", () => {
  const year = summariseYear({
    "2024-01-01": [s("Weights", "Strength", 45), s("Cycle", "Cycle", 15)],
    "2024-01-02": [],
    "2024-01-03": [s("Walk", "Walk", 30), s("Weights", "Strength", 30)],
    "2024-01-04": [s("Yoga", "Mobility", null)],
    "2024-01-05": [s("Walk", "Walk", 40)],
  });

  assert.equal(year.workoutDays, 4);
  assert.equal(year.recordedDays, 5);
  // A walk-only day is a Workout Day but not a Session Day.
  assert.equal(year.sessionDays, 3);
  assert.equal(year.sessionDayRate, 0.6);
  // Unknown minutes count towards Workout Days but not towards hours or the mix.
  assert.equal(year.totalMinutes, 160);
  assert.deepEqual(year.minutesByCategory, { Strength: 75, Cycle: 15, Walk: 70 });
  assert.equal(year.hasUnknownMinutes, true);
});

test("an empty year has no Workout Days and a zero Session Day rate, not a division by zero", () => {
  const year = summariseYear({});
  assert.equal(year.workoutDays, 0);
  assert.equal(year.sessionDayRate, 0);
  assert.equal(year.hasUnknownMinutes, false);
});

test("a year lists the Activities each Category covered, most frequent first", () => {
  const year = summariseYear({
    "2025-02-01": [s("Weights", "Strength", 40), s("Cycle", "Cycle", 12)],
    "2025-02-02": [s("Core", "Strength", 15), s("Weights", "Strength", 30)],
    "2025-02-03": [s("Calisthenics", "Strength", null)],
  });
  assert.deepEqual(year.activitiesByCategory, {
    Strength: ["Weights", "Core", "Calisthenics"],
    Cycle: ["Cycle"],
  });
});

test("a day mixing Fitbit minutes with Tracker-only Sessions keeps its known minutes and says what's missing", () => {
  const short = summariseDay([s("Cycle", "Cycle", 12, "morning"), s("Weights", "Strength", null)]);
  // Known minutes are a floor: never dimmer than a Tracker-only day.
  assert.equal(short.step, 2);
  assert.equal(short.totalMinutes, 12);
  assert.equal(short.footer, "Total 12m, plus 1 Session without minutes");

  const long = summariseDay([
    s("Cycle", "Cycle", 61, "morning"),
    s("Cycle", "Cycle", 37, "evening"),
    s("Weights", "Strength", null),
    s("Yoga", "Mobility", null),
  ]);
  assert.equal(long.step, 4);
  assert.equal(long.totalMinutes, 98);
  assert.equal(long.footer, "Total 1h 38m, plus 2 Sessions without minutes");
});
