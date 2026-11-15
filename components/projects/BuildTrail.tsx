import type { ReactNode } from "react";
import { hasBuildTrail, type BuildTrail as BuildTrailData } from "@/lib/buildTrail";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm leading-6">{children}</dd>
    </div>
  );
}

/** How a project was made. Parts that are missing are not shown; no parts, no block. */
export function BuildTrail({ trail }: { trail: BuildTrailData | undefined }) {
  if (!hasBuildTrail(trail)) return null;
  const { prompt, plan, model, prs, cost, broke } = trail;

  return (
    <section
      aria-labelledby="build-trail"
      className="mt-12 rounded-lg border border-border bg-card px-5 py-4"
    >
      <h2 id="build-trail" className="text-lg font-semibold tracking-tight">
        Build Trail
      </h2>
      <dl className="mt-2 divide-y divide-border">
        {prompt && (
          <Row label="Prompt">
            <p className="whitespace-pre-line border-l-2 border-accent pl-3 italic">{prompt}</p>
          </Row>
        )}
        {plan && <Row label="Plan">{plan}</Row>}
        {model && <Row label="Model">{model}</Row>}
        {prs !== undefined && <Row label="Pull requests">{prs}</Row>}
        {cost && <Row label="Cost">{cost}</Row>}
        {broke && (
          <Row label="What broke">
            <ul className="space-y-2">
              {broke.map((entry) => (
                <li key={entry.what} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="flex-1">{entry.what}</span>
                  {entry.cost && (
                    <span className="shrink-0 text-muted tabular-nums">{entry.cost}</span>
                  )}
                </li>
              ))}
            </ul>
          </Row>
        )}
      </dl>
    </section>
  );
}
