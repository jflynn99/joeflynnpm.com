// A project's Build Trail (see GLOSSARY.md): how it was made, in whatever
// parts Joe kept. Every part is optional and unknown keys fail, so a typo
// cannot quietly hide a part. Never fill a part with anything the project's
// own post does not say.

import { z } from "zod";

const brokeSchema = z.strictObject({
  /** What went wrong, in a sentence. */
  what: z.string().min(1),
  /** What it cost, as written in the post ("$88"). */
  cost: z.string().min(1).optional(),
});

export const buildTrailSchema = z.strictObject({
  /** The prompt that started the build. */
  prompt: z.string().min(1).optional(),
  /** How the build was planned. */
  plan: z.string().min(1).optional(),
  /** The model or models that did the work. */
  model: z.string().min(1).optional(),
  /** How many pull requests it took. */
  prs: z.number().int().positive().optional(),
  /** What it cost, as written in the post. */
  cost: z.string().min(1).optional(),
  /** What broke along the way. */
  broke: z.array(brokeSchema).min(1).optional(),
});

export type BuildTrail = z.infer<typeof buildTrailSchema>;
export type BrokeEntry = z.infer<typeof brokeSchema>;

/** Validate a project's `buildTrail` block. Throws, naming the project, on anything wrong. */
export function parseBuildTrail(slug: string, raw: unknown): BuildTrail | undefined {
  if (raw === undefined) return undefined;
  const result = buildTrailSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Project "${slug}" has a malformed buildTrail: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** True when the trail has at least one part to show. */
export function hasBuildTrail(trail: BuildTrail | undefined): trail is BuildTrail {
  return trail !== undefined && Object.values(trail).some((part) => part !== undefined);
}
