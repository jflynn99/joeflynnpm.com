import Image from "next/image";
import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { isValidElement } from "react";
import { renderMermaid, type MermaidDiagram } from "@/lib/mermaid";

interface CalloutProps {
  children: React.ReactNode;
  type?: "info" | "warning" | "tip";
}

function Callout({ children, type = "info" }: CalloutProps) {
  const styles = {
    info: "border-accent bg-accent/10",
    warning: "border-yellow-500 bg-yellow-500/10",
    tip: "border-green-500 bg-green-500/10",
  };

  const icons = {
    info: "💡",
    warning: "⚠️",
    tip: "✨",
  };

  return (
    <div
      className={`my-6 rounded-lg border-l-4 p-4 ${styles[type]}`}
      role="note"
    >
      <div className="flex gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

interface CustomImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

function CustomImage({ src, alt, className }: CustomImageProps) {
  if (!src) return null;

  const combinedClassName = `rounded-lg ${className || ""}`.trim();

  // Handle external images
  if (src.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || ""}
        className={combinedClassName}
        loading="lazy"
      />
    );
  }

  // Handle local images with Next.js Image
  return (
    <Image
      src={src}
      alt={alt || ""}
      width={800}
      height={450}
      className={combinedClassName}
    />
  );
}

function CustomLink({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return <span {...props}>{children}</span>;

  // External links
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline underline-offset-4 hover:text-accent-hover"
        {...props}
      >
        {children}
      </a>
    );
  }

  // Internal links
  return (
    <Link
      href={href}
      className="text-accent underline underline-offset-4 hover:text-accent-hover"
      {...props}
    >
      {children}
    </Link>
  );
}

/** The source of a ```mermaid fence (pre > code.language-mermaid), else null. */
function mermaidSource(children: React.ReactNode): string | null {
  if (!isValidElement<{ className?: string; children?: unknown }>(children)) {
    return null;
  }
  const { className, children: code } = children.props;
  if (!className?.split(" ").includes("language-mermaid")) return null;
  return typeof code === "string" ? code : null;
}

// Rendered at build time, so readers get plain SVG and no diagram JavaScript.
// Text is never shrunk below ~65% of its size; wider diagrams scroll sideways
// (see .diagram in globals.css). When Pele has a separate phone layout, CSS
// swaps it in on narrow screens.
function Diagram({ wide, narrow }: MermaidDiagram) {
  return (
    <figure className="diagram">
      <div
        className={narrow ? "diagram-wide" : undefined}
        style={{ "--diagram-w": `${wide.width}px` } as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: wide.svg }}
      />
      {narrow && (
        <div
          className="diagram-narrow"
          style={{ "--diagram-w": `${narrow.width}px` } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: narrow.svg }}
        />
      )}
    </figure>
  );
}

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1 className="mb-4 mt-8 text-3xl font-bold tracking-tight" {...props} />
  ),
  h2: (props) => (
    <h2
      className="mb-3 mt-8 text-2xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mb-2 mt-6 text-xl font-semibold tracking-tight" {...props} />
  ),
  h4: (props) => (
    <h4 className="mb-2 mt-4 text-lg font-semibold" {...props} />
  ),
  p: (props) => <p className="mb-4 leading-7" {...props} />,
  a: CustomLink,
  img: CustomImage as any,
  ul: (props) => <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />,
  ol: (props) => (
    <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />
  ),
  li: (props) => <li className="leading-7" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l-4 border-accent pl-4 italic text-muted"
      {...props}
    />
  ),
  hr: (props) => <hr className="my-8 border-border" {...props} />,
  table: (props) => (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-border" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="px-4 py-2 text-left text-sm font-semibold"
      {...props}
    />
  ),
  td: (props) => (
    <td className="px-4 py-2 text-sm" {...props} />
  ),
  pre: (props) => {
    const source = mermaidSource(props.children);
    const diagram = source !== null ? renderMermaid(source) : null;
    if (diagram) return <Diagram {...diagram} />;

    // Everything else, including a mermaid block that failed to render
    return (
      <pre
        className="mb-4 overflow-x-auto rounded-lg border border-border bg-card p-4"
        {...props}
      />
    );
  },
  code: (props) => {
    // Inline code (not in a pre block)
    const isInline = typeof props.children === "string";
    if (isInline) {
      return (
        <code
          className="rounded bg-card px-1.5 py-0.5 font-mono text-sm"
          {...props}
        />
      );
    }
    return <code {...props} />;
  },
  Callout,
};
