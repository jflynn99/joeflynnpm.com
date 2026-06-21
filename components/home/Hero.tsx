import Link from "next/link";
import { WeightRampTitle } from "@/components/WeightRampTitle";

export function Hero() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl">
        <WeightRampTitle
          as="h1"
          className="text-4xl tracking-tight sm:text-5xl lg:text-6xl"
          text={[
            { text: "Hey, I'm " },
            { text: "Joe Flynn", className: "text-accent" },
          ]}
        />
        <p className="mt-6 text-lg text-muted sm:text-xl leading-relaxed">
          Product manager, technologist, and builder. I write about product management,
          AI, books, and other fun things!
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
          >
            Read the blog
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-card"
          >
            View projects
          </Link>
        </div>
      </div>
    </section>
  );
}
