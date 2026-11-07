# joeflynnpm.com

Joe's personal site: writing, projects, book reviews, and personal analytics drawn from his own tracking data.

## Analytics

**Habit**:
A daily behaviour Joe logs in his tracker (sleep quality, coffees, meditation, workouts, and so on), one value per day.
_Avoid_: Metric, stat

**Tracker**:
Joe's own daily habit log, filled in by hand. The source of every Habit, and the fallback source of Sessions where Fitbit has none.
_Avoid_: Habit sheet, form

**Session**:
One continuous bout of exercise with a single Activity, a duration in minutes, and a time of day. A day can hold several.
_Avoid_: Workout (for a single bout), exercise, activity log

**Activity**:
What a Session was, after spelling and naming are cleaned up (Weights, Cycle, Pilates). Raw names from Fitbit or the Tracker are mapped to an Activity.
_Avoid_: Exercise type, workout type

**Category**:
One of six groupings of Activities used for colour: Strength, Cardio, Cycle, Mobility, Walk, Other.
_Avoid_: Type, group

**Workout Day**:
A day with at least one Session. Its colour is the Category with the most minutes, ignoring Walk unless the day had nothing else. Its brightness is its total minutes, walks included.
_Avoid_: Active day

**Rest Day**:
A day with no Sessions, including days logged as "No" or "none" in the Tracker.
_Avoid_: Off day, zero day

## Reading

**Book**:
A book Joe has finished and that has its own page under /books. The set of Books is the set of book pages, not the Goodreads shelf.
_Avoid_: Read, title, entry

**Dated Book**:
A Book with a recorded read date. Only Dated Books appear on charts over time; books read before 2018 were logged without one.
_Avoid_: Recent book

**Genre**:
One of twenty subject labels on a Book (History, Sci-Fi, Classics, and so on). A Book has one or two.
_Avoid_: Category (that word belongs to workouts), shelf, tag

**Fiction / Non-fiction**:
The split of Books by Genre. Classics counts as Fiction unless the Book also carries a Non-fiction Genre.
_Avoid_: Novel
