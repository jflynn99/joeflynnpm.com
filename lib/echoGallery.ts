// The Echo Gallery: Echo's raw answers to a fixed list of prompts (see
// GLOSSARY.md). One Answer Set was saved before she was post-trained; a second
// can sit beside it afterwards. The file is written by
// scripts/import-echo-gallery.mjs and is never edited by hand.

import fs from "fs";
import path from "path";
import { z } from "zod";

export const ANSWER_SET_LABELS = ["before", "after"] as const;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const answerSchema = z.strictObject({
  id: z.string().min(1),
  prompt: z.string().min(1),
  /** Exactly what the model produced. May be empty; never trimmed or tidied. */
  answer: z.string(),
  /** True when the answer hit the token limit before the model stopped. */
  cutOff: z.boolean(),
});

const settingsSchema = z.strictObject({
  temperature: z.number().min(0),
  topK: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
  seed: z.number().int(),
  /** Where it ran, e.g. "laptop CPU". */
  device: z.string().min(1),
});

const answerSetSchema = z.strictObject({
  label: z.enum(ANSWER_SET_LABELS),
  /** The day the answers were generated, as an ISO date. */
  date: z.string().regex(isoDate, "date must be an ISO date like 2026-11-15"),
  /** Which checkpoint answered, in plain words. */
  model: z.string().min(1),
  settings: settingsSchema,
  answers: z.array(answerSchema).min(1),
});

const gallerySchema = z
  .strictObject({ sets: z.array(answerSetSchema).min(1).max(2) })
  .superRefine((gallery, ctx) => {
    const labels = gallery.sets.map((set) => set.label);
    if (new Set(labels).size !== labels.length) {
      ctx.addIssue({ code: "custom", message: "Each Answer Set needs its own label", path: ["sets"] });
    }
    if (labels[0] !== "before") {
      ctx.addIssue({ code: "custom", message: "The first Answer Set must be the before set", path: ["sets", 0, "label"] });
    }
    const [first, ...rest] = gallery.sets;
    const ids = first.answers.map((answer) => answer.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Answer ids must be unique", path: ["sets", 0, "answers"] });
    }
    // A before-and-after only means something if both sets answer the same
    // prompts, in the same order.
    rest.forEach((set, index) => {
      const same =
        set.answers.length === first.answers.length &&
        set.answers.every(
          (answer, i) => answer.id === first.answers[i].id && answer.prompt === first.answers[i].prompt,
        );
      if (!same) {
        ctx.addIssue({
          code: "custom",
          message: "Every Answer Set must hold the same prompts in the same order",
          path: ["sets", index + 1, "answers"],
        });
      }
    });
  });

export type EchoAnswer = z.infer<typeof answerSchema>;
export type AnswerSet = z.infer<typeof answerSetSchema>;
export type EchoGallery = z.infer<typeof gallerySchema>;

/** Validate the raw file contents. Throws on anything wrong. */
export function parseEchoGallery(raw: unknown): EchoGallery {
  return gallerySchema.parse(raw);
}

const galleryFile = path.join(process.cwd(), "content/echo-gallery.json");

export function getEchoGallery(): EchoGallery | null {
  if (!fs.existsSync(galleryFile)) return null;
  return parseEchoGallery(JSON.parse(fs.readFileSync(galleryFile, "utf8")));
}

/** One row of the gallery: a prompt and each Answer Set's answer to it. */
export interface GalleryRow {
  id: string;
  prompt: string;
  answers: { label: AnswerSet["label"]; answer: string; cutOff: boolean }[];
}

export function galleryRows(gallery: EchoGallery): GalleryRow[] {
  return gallery.sets[0].answers.map((first, i) => ({
    id: first.id,
    prompt: first.prompt,
    answers: gallery.sets.map((set) => ({
      label: set.label,
      answer: set.answers[i].answer,
      cutOff: set.answers[i].cutOff,
    })),
  }));
}

/** "15 November 2026" from "2026-11-15". */
export function formatSetDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "temperature 0.6, top-k 50, up to 256 tokens, seed 42, on a laptop CPU" */
export function describeSettings(settings: AnswerSet["settings"]): string {
  return `temperature ${settings.temperature}, top-k ${settings.topK}, up to ${settings.maxTokens} tokens, seed ${settings.seed}, on ${settings.device}`;
}
