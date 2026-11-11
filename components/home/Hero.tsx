import { WeightRampTitle } from "@/components/WeightRampTitle";

export function Hero() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl">
        <WeightRampTitle
          as="h1"
          rise
          className="text-4xl tracking-tight sm:text-5xl lg:text-6xl"
          text={[{ text: "Joe Flynn.", className: "text-accent" }]}
        />
        <p className="mt-6 text-xl font-medium leading-snug sm:text-2xl">
          Product manager, dad of two, builder of things I&apos;m not qualified
          to build.
        </p>
        <p className="mt-4 text-lg text-muted sm:text-xl leading-relaxed">
          Senior PM working on AI at Amex GBT, based near Liverpool. I write
          about AI, books, and whatever I&apos;ve built lately.
        </p>
      </div>
    </section>
  );
}
