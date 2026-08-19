/**
 * Builds the /og URL for a page that has opted in with `ogCard: true`.
 *
 * Returns null when the page has not opted in, so callers fall back to
 * whatever image they used before. Existing content is therefore
 * untouched until its frontmatter says otherwise.
 */
export function ogCardUrl(opts: {
  ogCard?: boolean;
  title: string;
  kicker: string;
  sub?: (string | undefined)[];
  img?: string;
}): string | null {
  if (!opts.ogCard) return null;

  const params = new URLSearchParams({ title: opts.title, kicker: opts.kicker });

  const sub = (opts.sub ?? []).filter((s): s is string => Boolean(s && s.trim()));
  if (sub.length > 0) params.set("sub", sub.join("|"));
  if (opts.img) params.set("img", opts.img);

  // Relative on purpose: metadataBase in app/layout.tsx resolves it to an
  // absolute URL, which is what scrapers require.
  return `/og?${params.toString()}`;
}
