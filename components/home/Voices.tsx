import { WeightRampTitle } from "@/components/WeightRampTitle";
import type { Voice } from "@/lib/voices";

interface VoicesProps {
  voices: Voice[];
}

// Text-led on purpose: no logos or avatars, just who they are and why Joe reads them.
export function Voices({ voices }: VoicesProps) {
  if (voices.length === 0) return null;

  return (
    <section aria-label="Voices" className="py-12 sm:py-16">
      <div className="mb-8">
        <WeightRampTitle
          as="h2"
          className="text-2xl tracking-tight sm:text-3xl"
          text="Voices"
        />
        <p className="mt-2 text-muted">The writers I read and rate.</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {voices.map((voice) => (
          <li key={voice.url}>
            <a
              href={voice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent"
            >
              <p className="font-semibold leading-snug group-hover:text-accent transition-colors">
                {voice.name}
                <span aria-hidden="true" className="ml-1 text-muted">↗</span>
              </p>
              {voice.publication && (
                <p className="text-sm text-muted">{voice.publication}</p>
              )}
              <p className="mt-2 text-sm">{voice.tagline}</p>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
