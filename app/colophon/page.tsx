import fs from "fs";
import path from "path";
import { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Container } from "@/components/layout";
import { BuildTrail } from "@/components/projects";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { collectBroke, getColourTokens, getDecisions } from "@/lib/colophon";
import { getAllProjects, getProjectBySlug } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Colophon",
  description:
    "How joeflynnpm.com is built: the stack, the site's own Build Trail, the glossary, the decisions, the palette, and everything that broke.",
};

/** The site's own project page, whose Build Trail is the site's. */
const SITE_PROJECT = "personal-website";

function major(name: string): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const version: string = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? "";
  return version.replace(/^[^\d]*/, "").split(".")[0];
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12 scroll-mt-24">
      <h2 id={id} className="mb-4 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ColophonPage() {
  const site = getProjectBySlug(SITE_PROJECT);
  const glossary = fs.readFileSync(path.join(process.cwd(), "GLOSSARY.md"), "utf8");
  const decisions = getDecisions();
  const tokens = getColourTokens();
  const broke = collectBroke(getAllProjects());

  const stack = [
    ["Framework", `Next.js ${major("next")} with React ${major("react")}`],
    ["Styling", `Tailwind CSS ${major("tailwindcss")} with the Typography plugin`],
    ["Content", "MDX files in the repo for posts, projects, and books; JSON for the reading strip and Voices"],
    ["Chat", `Vercel AI SDK ${major("ai")} with Anthropic models, for the agent and the library chatbot`],
    ["Type", "Literata for long-form bodies, the system font for everything else"],
    ["Hosting", "Vercel, with Vercel Analytics"],
  ];

  return (
    <Container width="narrow">
      <WeightRampTitle as="h1" className="text-3xl tracking-tight sm:text-4xl" text="Colophon" />

      <Section id="made" title="How the site is made">
        <dl className="divide-y divide-border border-y border-border">
          {stack.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
              <dd className="text-sm leading-6">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {site?.frontmatter.buildTrail && (
        <Section id="trail" title="The site's Build Trail">
          <p className="text-sm text-muted">
            From the project write-up,{" "}
            <Link href={`/projects/${SITE_PROJECT}`} className="text-accent hover:text-accent-hover">
              {site.frontmatter.title}
            </Link>
            .
          </p>
          <div className="-mt-8">
            <BuildTrail trail={site.frontmatter.buildTrail} />
          </div>
        </Section>
      )}

      <Section id="glossary" title="Glossary">
        <p className="mb-4 text-sm text-muted">
          The words the site uses for its own things, rendered from <code>GLOSSARY.md</code>.
        </p>
        <div className="prose max-w-none rounded-lg border border-border bg-card px-5 py-4 prose-h1:hidden prose-h2:mt-6 prose-h2:text-lg prose-p:my-2 prose-p:whitespace-pre-line">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{glossary}</ReactMarkdown>
        </div>
      </Section>

      {decisions.length > 0 && (
        <Section id="decisions" title="Decisions">
          <ul className="divide-y divide-border border-y border-border">
            {decisions.map((d) => (
              <li key={d.file} className="py-3">
                <p className="font-medium">{d.title}</p>
                <div className="mt-1 text-sm leading-6 text-muted [&_code]:font-mono [&_code]:text-xs">
                  <ReactMarkdown>{d.summary}</ReactMarkdown>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">docs/adr/{d.file}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="palette" title="Palette">
        <p className="text-sm leading-6 text-muted">
          Every colour is OKLCH. The accent and the neutrals all derive from one hue, so the colour
          dots in the header re-theme the whole site, and the swatches below follow them and the
          light or dark mode. The workout Category colours and the Fiction and Non-fiction pair are
          the exception: fixed values, validated all-pairs against the card colour in each mode
          for colour-blind readers and for separation in small cells. Only four hues passed at
          12px, so Walk and Other share the neutral. In light mode the Non-fiction amber is 2.99:1
          against the card, so those charts always carry a legend, a readout, and a text table.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tokens.map((token) => (
            <li key={token.name} className="flex items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-md border border-border"
                style={{ background: `var(${token.name})` }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block font-mono text-xs">{token.name}</span>
                <span className="block truncate font-mono text-xs text-muted" title={token.dark}>
                  {token.dark}
                </span>
                {token.light && (
                  <span className="block truncate font-mono text-xs text-muted-foreground" title={token.light}>
                    light: {token.light}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {broke.length > 0 && (
        <Section id="broke" title="What broke">
          <p className="mb-4 text-sm text-muted">Every failure recorded in a project&apos;s Build Trail.</p>
          <ul className="divide-y divide-border border-y border-border">
            {broke.map((entry) => (
              <li key={`${entry.project.slug}-${entry.what}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                <div className="flex-1">
                  <p className="text-sm leading-6">{entry.what}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.project.href ? (
                      <Link href={entry.project.href} className="hover:text-accent transition-colors">
                        {entry.project.title}
                      </Link>
                    ) : (
                      entry.project.title
                    )}
                  </p>
                </div>
                {entry.cost && <span className="shrink-0 text-sm text-muted tabular-nums">{entry.cost}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Container>
  );
}
