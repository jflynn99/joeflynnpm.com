// Loads the library chatbot's committed eval snapshots for /books/evals.
// Read at build time; the page never runs the evals itself.

import fs from "fs";
import path from "path";
import { z } from "zod";
import { snapshotSchema, type EvalSnapshot } from "./evals.ts";

const snapshotsDirectory = path.join(process.cwd(), "evals/library/snapshots");

/** Validate one snapshot file. Throws, naming the file, on anything wrong. */
export function parseEvalSnapshot(file: string, raw: unknown): EvalSnapshot {
  const result = snapshotSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Eval snapshot "${file}" is malformed: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Every committed snapshot, oldest run first. A bad file fails the build. */
export function getEvalSnapshots(): EvalSnapshot[] {
  if (!fs.existsSync(snapshotsDirectory)) return [];
  return fs
    .readdirSync(snapshotsDirectory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => parseEvalSnapshot(file, JSON.parse(fs.readFileSync(path.join(snapshotsDirectory, file), "utf8"))))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface EvalFlip {
  id: string;
  question: string;
  pass: boolean;
}

export interface EvalHistoryEntry {
  snapshot: EvalSnapshot;
  /** Questions in both this run and the one before whose verdict changed. Empty for the first run. */
  flips: EvalFlip[];
}

/** One entry per snapshot, newest first, each with the questions that flipped since the run before. */
export function evalHistory(snapshots: EvalSnapshot[]): EvalHistoryEntry[] {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  return sorted
    .map((snapshot, i) => {
      const previous = new Map(sorted[i - 1]?.results.map((r) => [r.id, r.pass]) ?? []);
      const flips = snapshot.results
        .filter((r) => previous.has(r.id) && previous.get(r.id) !== r.pass)
        .map((r) => ({ id: r.id, question: r.question, pass: r.pass }));
      return { snapshot, flips };
    })
    .reverse();
}
