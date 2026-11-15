import {
  describeSettings,
  formatSetDate,
  galleryRows,
  getEchoGallery,
  type AnswerSet,
} from "@/lib/echoGallery";
import { EchoAnswer } from "./EchoAnswer";

const SET_NAMES: Record<AnswerSet["label"], string> = {
  before: "Before post-training",
  after: "After post-training",
};

/**
 * The Echo Gallery: `<EchoGallery />` in the Echo project page. Each prompt,
 * then her answer exactly as given. With one Answer Set it is a single list;
 * with two, the before and after answers sit side by side on wide screens.
 * Kept out of the prose styles so the answers are not restyled as body text.
 */
export function EchoGallery() {
  const gallery = getEchoGallery();
  if (!gallery) return null;

  const rows = galleryRows(gallery);
  const settingsBySet = new Map(gallery.sets.map((set) => [set.label, set.settings]));
  const paired = gallery.sets.length > 1;

  return (
    <section className="not-prose my-10 text-base" aria-label="Echo's answers">
      <ul className="mb-6 space-y-1 text-sm text-muted">
        {gallery.sets.map((set) => (
          <li key={set.label}>
            <span className="font-semibold text-foreground">{SET_NAMES[set.label]}</span>
            {": "}
            {set.answers.length} answers from {formatSetDate(set.date)} ({set.model};{" "}
            {describeSettings(set.settings)}). Shown exactly as she gave them.
          </li>
        ))}
      </ul>

      <ol className="space-y-6">
        {rows.map((row, index) => (
          <li key={row.id} className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 font-semibold">
              <span className="mr-2 text-muted">{index + 1}.</span>
              {row.prompt}
            </p>
            <div className={paired ? "grid gap-4 md:grid-cols-2" : undefined}>
              {row.answers.map((entry) => (
                <div key={entry.label}>
                  {paired && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {entry.label}
                    </p>
                  )}
                  <EchoAnswer
                    answer={entry.answer}
                    cutOff={entry.cutOff}
                    maxTokens={settingsBySet.get(entry.label)!.maxTokens}
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
