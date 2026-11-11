import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { CurrentReadList } from "@/components/home";
import { mdxComponents } from "@/components/mdx";
import { mdxOptions } from "@/lib/mdxOptions";
import { formatUpdated, getNow } from "@/lib/now";
import { getCurrentReads } from "@/lib/currentReads";
import { getVoices, VOICE_GROUPS } from "@/lib/voices";

export const metadata: Metadata = {
  title: "Now",
  description: "What Joe Flynn is doing at the moment: work, home, building, reading, and the writers he follows.",
};

export default function NowPage() {
  const { updated, content } = getNow();
  const reads = getCurrentReads();
  const voices = getVoices();
  const groups = VOICE_GROUPS.map((group) => ({
    group,
    voices: voices.filter((voice) => voice.group === group),
  })).filter(({ voices }) => voices.length > 0);

  return (
    <Container width="narrow">
      <WeightRampTitle as="h1" className="text-3xl tracking-tight sm:text-4xl" text="Now" />
      <p className="mt-2 text-sm text-muted">
        Last updated <time dateTime={updated}>{formatUpdated(updated)}</time>
      </p>

      <div className="prose prose-lg mt-8 max-w-none">
        <MDXRemote source={content} components={mdxComponents} options={mdxOptions} />
      </div>

      {reads.length > 0 && (
        <section aria-labelledby="reading" className="mt-12">
          <h2 id="reading" className="mb-4 text-xl font-semibold tracking-tight">
            Reading
          </h2>
          <CurrentReadList reads={reads} />
        </section>
      )}

      <section aria-labelledby="voices" className="mt-12 scroll-mt-24">
        <h2 id="voices" className="text-xl font-semibold tracking-tight">
          Voices
        </h2>
        <p className="mt-1 text-muted">The writers I read and rate.</p>

        {groups.map(({ group, voices }) => (
          <div key={group} className="mt-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
              {group}
            </h3>
            <ul className="divide-y divide-border border-y border-border">
              {voices.map((voice) => (
                <li key={voice.url} className="py-3">
                  <a
                    href={voice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:text-accent transition-colors"
                  >
                    {voice.name}
                    <span aria-hidden="true" className="ml-1 text-muted">↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {voice.publication && (
                    <span className="text-sm text-muted"> · {voice.publication}</span>
                  )}
                  {voice.tagline && <p className="mt-1 text-sm">{voice.tagline}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </Container>
  );
}
