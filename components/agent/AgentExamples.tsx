"use client";

import type { UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import type { AgentExample } from "@/lib/agent/examples";
import { AgentTimeline } from "./AgentTimeline";
import { DecisionBrief } from "./DecisionBrief";

// How fast a replay reveals its steps, in milliseconds per step.
const REPLAY_STEP_MS = 140;

/** The saved steps as one assistant message, the shape AgentTimeline reads. */
function toMessages(example: AgentExample, shown: number): UIMessage[] {
  const parts = example.steps.slice(0, shown).map((step) =>
    step.type === "text"
      ? { type: "text" as const, text: step.text }
      : {
          type: `tool-${step.tool}` as const,
          toolCallId: `${example.slug}-${step.tool}`,
          state: "output-available" as const,
          input: step.input,
          output: step.result,
        },
  );
  return [{ id: example.slug, role: "assistant", parts } as UIMessage];
}

function formatTokens(n: number): string {
  return n.toLocaleString("en-GB");
}

function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Saved runs of the agent, replayed from files built into the page. Choosing
 * one makes no request to the chat API and spends none of the daily queries.
 */
export function AgentExamples({ examples }: { examples: AgentExample[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const example = examples.find((ex) => ex.slug === selected) ?? null;

  useEffect(() => {
    if (!example || shown >= example.steps.length) return;
    const timer = setTimeout(() => setShown((n) => n + 1), REPLAY_STEP_MS);
    return () => clearTimeout(timer);
  }, [example, shown]);

  const messages = useMemo(() => (example ? toMessages(example, shown) : []), [example, shown]);

  if (examples.length === 0) return null;

  const replaying = example !== null && shown < example.steps.length;
  const { usage, price } = example ?? { usage: null, price: null };
  const inputTotal = usage ? usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens : 0;

  return (
    <section aria-labelledby="agent-examples" className="mt-12 border-t border-border pt-8">
      <h2 id="agent-examples" className="text-lg font-semibold tracking-tight">
        Example runs
      </h2>
      <p className="mt-1 text-sm text-muted">
        Real runs, saved as they happened. Replaying one costs nothing and doesn&apos;t use your
        daily questions.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {examples.map((ex) => (
          <button
            key={ex.slug}
            type="button"
            onClick={() => {
              setSelected(ex.slug);
              setShown(0);
            }}
            aria-pressed={ex.slug === selected}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              ex.slug === selected
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-card text-muted hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {ex.brief}
          </button>
        ))}
      </div>

      {example && usage && price && (
        <div className="mt-8 space-y-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Model</dt>
              <dd className="mt-0.5 font-mono text-xs">{example.model}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Run on</dt>
              <dd className="mt-0.5">{formatDate(example.capturedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Tokens</dt>
              <dd className="mt-0.5 tabular-nums">
                {formatTokens(inputTotal)} in, {formatTokens(usage.outputTokens)} out
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Cost</dt>
              <dd className="mt-0.5 tabular-nums">${example.cost.toFixed(4)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <dt className="sr-only">How the cost adds up</dt>
              <dd className="text-xs leading-5 text-muted tabular-nums">
                {formatTokens(usage.inputTokens)} new input × {formatPrice(price.input)} +{" "}
                {formatTokens(usage.cacheReadTokens)} cached × {formatPrice(price.cacheRead)} +{" "}
                {formatTokens(usage.cacheWriteTokens)} cache writes ×{" "}
                {formatPrice(price.cacheWrite)} +{" "}
                {formatTokens(usage.outputTokens)} output × {formatPrice(price.output)}, per million tokens, at
                the prices on the day it ran.
              </dd>
            </div>
          </dl>

          <AgentTimeline messages={messages} isLoading={replaying} />

          {!replaying && <DecisionBrief content={example.answer} />}
        </div>
      )}
    </section>
  );
}
