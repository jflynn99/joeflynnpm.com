import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { EVAL_GROUPS, type EvalSnapshot } from "@/lib/library/evals";
import { evalHistory, getEvalSnapshots } from "@/lib/library/evalSnapshots";

export const metadata: Metadata = {
  title: "Library chatbot evals",
  description:
    "Every question the library chatbot on /books is tested on, with its answer, the verdict, and the reason. Failures included.",
};

type Result = EvalSnapshot["results"][number];

const GROUP_LABELS: Record<Result["group"], string> = {
  lookup: "Lookups",
  count: "Counts",
  recommendation: "Recommendations",
  decline: "Should decline or redirect",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function StatCard({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className={`break-words font-bold tracking-tight ${small ? "text-base sm:text-lg" : "text-2xl"}`}>{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function Verdict({ pass }: { pass: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
        pass ? "border-accent/50 text-accent" : "border-red-500/50 text-red-500"
      }`}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

function ResultCard({ result, graderModel }: { result: Result; graderModel: string }) {
  const rubric = result.group === "recommendation" || result.group === "decline";
  return (
    <article id={result.id} className="scroll-mt-24 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{result.question}</h3>
        <Verdict pass={result.pass} />
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">
            {rubric ? "Rubric" : "Expected"}
          </dt>
          <dd className="mt-1 leading-6">{result.expected || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">Answer</dt>
          <dd className="mt-1 whitespace-pre-wrap leading-6">{result.answer}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">
            {rubric ? `Grader's reason (${graderModel})` : "Reason"}
          </dt>
          <dd className="mt-1 leading-6">{result.reason}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function LibraryEvalsPage() {
  const snapshots = getEvalSnapshots();
  const latest = snapshots.at(-1);
  const history = evalHistory(snapshots);

  return (
    <Container>
      <div className="mb-8">
        <WeightRampTitle as="h1" className="text-3xl tracking-tight sm:text-4xl" text="Library chatbot evals" />
        <p className="mt-2 text-muted">
          Every question the{" "}
          <Link href="/books" className="text-accent hover:text-accent-hover">
            library chatbot
          </Link>{" "}
          is tested on, with its answer and the verdict from the latest run, failures included.
          Lookups and counts are checked exactly against the book data. Recommendations and
          declines are graded by a model against a written rubric. Runs are done by hand; this
          page only shows the saved results.
        </p>
      </div>

      {!latest ? (
        <p className="text-muted">No runs yet.</p>
      ) : (
        <>
          <section aria-labelledby="latest" className="mb-12">
            <h2 id="latest" className="mb-4 text-xl font-semibold">
              Latest run
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label={`${latest.passed} of ${latest.total} passed`} value={percent(latest.passRate)} />
              <StatCard label="Run on" value={formatDate(latest.date)} small />
              <StatCard label="Chatbot model" value={latest.model} small />
              <StatCard label="Cost of the run" value={`$${latest.cost.usd.toFixed(2)}`} />
            </div>
            {latest.note && <p className="mt-4 text-sm">{latest.note}</p>}
            {latest.passed < latest.total && (
              <div className="mt-6 text-sm">
                <p className="font-medium">Failed:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {latest.results
                    .filter((r) => !r.pass)
                    .map((r) => (
                      <li key={r.id}>
                        <a href={`#${r.id}`} className="text-accent hover:text-accent-hover">
                          {r.question}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </section>

          {EVAL_GROUPS.map((group) => {
            const results = latest.results.filter((r) => r.group === group);
            if (results.length === 0) return null;
            const passed = results.filter((r) => r.pass).length;
            return (
              <section key={group} aria-labelledby={`group-${group}`} className="mb-12">
                <h2 id={`group-${group}`} className="mb-4 text-xl font-semibold">
                  {GROUP_LABELS[group]}{" "}
                  <span className="text-base font-normal text-muted">
                    {passed}/{results.length}
                  </span>
                </h2>
                <div className="space-y-4">
                  {results.map((r) => (
                    <ResultCard key={r.id} result={r} graderModel={latest.graderModel} />
                  ))}
                </div>
              </section>
            );
          })}

          <section aria-labelledby="history" className="mb-12">
            <h2 id="history" className="mb-4 text-xl font-semibold">
              History
            </h2>
            <ol className="divide-y divide-border border-y border-border">
              {history.map(({ snapshot, flips }, i) => (
                <li key={snapshot.date} className="py-3 text-sm">
                  <p>
                    <span className="font-medium">{formatDate(snapshot.date)}</span>
                    <span className="text-muted">
                      {" "}
                      · {snapshot.model} · {percent(snapshot.passRate)} ({snapshot.passed}/{snapshot.total})
                    </span>
                  </p>
                  {snapshot.note && <p className="mt-1">{snapshot.note}</p>}
                  {i < history.length - 1 && (
                    <p className="mt-1 text-muted">
                      {flips.length === 0
                        ? "No question changed verdict since the run before."
                        : flips.map((f, j) => (
                            <span key={f.id}>
                              {j > 0 && "; "}
                              {f.pass ? "Now passes: " : "Now fails: "}
                              {f.question}
                            </span>
                          ))}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </Container>
  );
}
