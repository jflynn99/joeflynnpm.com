# joeflynnpm.com

Joe's personal site: writing, projects, book reviews, and personal analytics drawn from his own tracking data.

## Analytics

**Habit**:
A daily behaviour Joe logs in his tracker (sleep quality, coffees, meditation, workouts, and so on), one value per day.
_Avoid_: Metric, stat

**Tracker**:
Joe's own daily habit log, filled in by hand. The source of every Habit, and of the Sessions Fitbit missed: on any date, a Tracker Activity counts when Fitbit has no Session in its Category. Fitbit wins where both have one.
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

**Session Day**:
A Workout Day with at least one Session other than Walk. Walks are everyday movement; a Session Day is a day with something Joe chose to do.
_Avoid_: Training day, active day

**Rest Day**:
A day with no Sessions, including days logged as "No" or "none" in the Tracker.
_Avoid_: Off day, zero day

## Projects

**Build Trail**:
How a project was made, in whatever parts Joe kept: the prompt, the plan, the model, the number of pull requests, the cost, and what broke. Every part is optional and only ever holds facts Joe has written down. In project frontmatter it is `buildTrail`.
_Avoid_: Changelog, postmortem, making-of

**Echo Gallery**:
Echo's raw answers to a fixed list of prompts, shown on her project page exactly as she gave them. It lives in `content/echo-gallery.json` and is never edited by hand.
_Avoid_: Samples, transcript, chat log

**Answer Set**:
One run of the Echo Gallery's prompts through one version of Echo, with the date and the settings used. There is a `before` set from before she was post-trained and, later, an `after` set with the same prompts and settings.
_Avoid_: Run, batch, snapshot

## Reading

**Book**:
A book Joe has finished and that has its own page under /books. The set of Books is the set of book pages, not the Goodreads shelf.
_Avoid_: Read, title, entry

**Current Read**:
A book Joe has started and not finished, shown in the "Right now" strip on the home page. It is not a Book: it has no page and never counts in /books or any reading stat. Current Reads live in `content/current-reads.json`; when Joe finishes one, it comes out of that file and becomes a Book.
_Avoid_: In progress, TBR

**Dated Book**:
A Book with a recorded read date. Only Dated Books appear on charts over time; books read before 2018 were logged without one. In frontmatter, a Book that is not Dated carries `undated: true`, and its `dateRead` is the day it was logged.
_Avoid_: Recent book

**Genre**:
One of twenty subject labels on a Book (History, Sci-Fi, Classics, and so on). A Book has one or two.
_Avoid_: Category (that word belongs to workouts), shelf, tag

**Publication Year**:
The year a Book's work first came out, not the year of the edition Joe read; negative for BCE. Every Book has one except podcasts. In frontmatter it is `published`.
_Avoid_: Edition year, release date

**One-liner**:
One sentence in Joe's own words, 40 words at most, on why a Book matters. Optional; in frontmatter it is `oneLiner`. Never written for him.
_Avoid_: Blurb, summary, tagline (that word belongs to Voices)

**Favourite**:
One of the 20 at most Books Joe would press on someone, chosen by hand and independent of rating. Every Favourite has a One-liner. In frontmatter it is `favourite: true`.
_Avoid_: Five-star pick (the 404 page's five-star Books are a separate idea), top book

**Fiction / Non-fiction**:
The split of Books by Genre. Classics counts as Fiction unless the Book also carries a Non-fiction Genre. So a classic novel is tagged Classics + a Fiction Genre (e.g. Literary Fiction), and Classics + Philosophy means a non-fiction work such as Phaedo.
_Avoid_: Novel

## Reading the web

**Voice**:
A writer (or a site run by a few writers) whose work Joe reads and rates. The full list lives in `content/voices.json`; the ones marked `home` show on the home page, each with a one-line tagline in Joe's own words.
_Avoid_: Blogroll, follows
