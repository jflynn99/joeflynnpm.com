# Workout data comes from Fitbit, built in habit-analysis

The workout heatmap on /analytics reads `public/data/workouts-<year>.json`, which is not built in this repo. An export script in the local `habit-analysis` project joins Fitbit sessions (primary from 2024-07-21) with the Tracker (fallback for earlier days and days Fitbit missed), cleans Activity names, and writes only an approved list of fields: Activity, minutes, and time of day. We chose this because the Fitbit Takeout export is large (~5.5 GB) and already processed in `habit-analysis`, and because keeping the join there means heart rate, calories, and recovery metrics never enter this public repo.

## Consequences

- The workout data is only as fresh as Joe's last manual Google Takeout export. There is no automated refresh.
- To change what the heatmap shows (new fields, different Activity mapping), edit the export script in `habit-analysis`, not this repo.
- Short `auto_detected` Fitbit walks (under 15 minutes) are dropped at export, so they never count as Sessions.
