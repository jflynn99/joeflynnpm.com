// ChartSpec — the core abstraction (SPEC.md §5). Everything renders from this:
// the agent emits it, the overlay builder edits it, the URL serialises it.

import { z } from "zod";

export const seriesRefSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/i).max(200),
  column: z.string().min(1).max(200),
  axis: z.enum(["left", "right"]),
  color: z.string().max(30).optional(),
});

export const axisConfigSchema = z.object({
  label: z.string().max(200).optional(),
  // Log scale is a render flag on the axis, not a data transform
  log: z.boolean().optional(),
});

export const transformSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("indexTo100"), baseYear: z.number().int() }),
  z.object({ kind: z.literal("perCapita") }),
  z.object({ kind: z.literal("zScore") }),
]);

export const annotationSchema = z.object({
  year: z.number().int(),
  text: z.string().max(300),
});

export const chartSpecSchema = z
  .object({
    v: z.literal(1),
    title: z.string().min(1).max(300),
    series: z.array(seriesRefSchema).min(1).max(8),
    transforms: z.array(transformSchema).max(4).default([]),
    axes: z.object({
      left: axisConfigSchema,
      right: axisConfigSchema.optional(),
    }),
    entities: z.array(z.string().min(1).max(100)).min(1).max(50),
    timeRange: z.tuple([z.number().int(), z.number().int()]),
    annotations: z.array(annotationSchema).max(20).optional(),
    caveats: z.array(z.string().max(500)).max(10).optional(),
  })
  .superRefine((spec, ctx) => {
    if (spec.timeRange[0] > spec.timeRange[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timeRange start must be <= end",
        path: ["timeRange"],
      });
    }
    const usesRight = spec.series.some((s) => s.axis === "right");
    if (usesRight && !spec.axes.right) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "a series targets the right axis but axes.right is not configured",
        path: ["axes", "right"],
      });
    }
    const hasZScore = spec.transforms.some((t) => t.kind === "zScore");
    const hasLog = spec.axes.left.log || spec.axes.right?.log;
    if (hasZScore && hasLog) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "log scale cannot be combined with zScore (values cross zero)",
        path: ["axes"],
      });
    }
  });

export type ChartSpec = z.infer<typeof chartSpecSchema>;
export type SeriesRef = z.infer<typeof seriesRefSchema>;
export type Transform = z.infer<typeof transformSchema>;
export type AxisConfig = z.infer<typeof axisConfigSchema>;

export type SpecValidation =
  | { ok: true; spec: ChartSpec }
  | { ok: false; errors: string[] };

export function validateSpec(input: unknown): SpecValidation {
  const result = chartSpecSchema.safeParse(input);
  if (result.success) return { ok: true, spec: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

// URL codec: base64url(JSON). Used by /overlay?s=... — decode always re-validates.
export function encodeSpec(spec: ChartSpec): string {
  const json = JSON.stringify(spec);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(json).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSpec(encoded: string): SpecValidation {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
        : Buffer.from(base64, "base64").toString("utf8");
    return validateSpec(JSON.parse(json));
  } catch {
    return { ok: false, errors: ["could not decode spec from URL"] };
  }
}

// Key for the per-SeriesRef data/metadata maps passed to ChartRenderer.
export function seriesKey(ref: { slug: string; column: string }): string {
  return `${ref.slug}:${ref.column}`;
}

export const CORRELATION_CAVEAT =
  "These series come from independent sources. Visual correlation does not imply causation.";
