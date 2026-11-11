// Voices: the writers Joe reads and rates (see GLOSSARY.md). The home page
// shows the ones marked `home`, in file order; the full list is for /now.

import fs from "fs";
import path from "path";
import { z } from "zod";

export const VOICE_GROUPS = ["AI", "Product and building", "Economics and politics", "Ideas"] as const;

const voiceSchema = z
  .strictObject({
    name: z.string().min(1),
    publication: z.string().min(1).optional(),
    url: z.url({ protocol: /^https$/ }),
    group: z.enum(VOICE_GROUPS),
    home: z.boolean(),
    /** One line, in Joe's words, on why he reads them. Required for home Voices. */
    tagline: z.string().min(1).optional(),
  })
  .refine((voice) => !voice.home || voice.tagline, {
    message: "A home Voice needs a tagline",
    path: ["tagline"],
  });

export type Voice = z.infer<typeof voiceSchema>;

/** Validate the raw list. Throws on anything wrong. */
export function parseVoices(raw: unknown): Voice[] {
  return z.array(voiceSchema).parse(raw);
}

const voicesFile = path.join(process.cwd(), "content/voices.json");

export function getVoices(): Voice[] {
  if (!fs.existsSync(voicesFile)) return [];
  return parseVoices(JSON.parse(fs.readFileSync(voicesFile, "utf8")));
}

/** The Voices shown on the home page, in file order. */
export function getHomeVoices(): Voice[] {
  return getVoices().filter((voice) => voice.home);
}
