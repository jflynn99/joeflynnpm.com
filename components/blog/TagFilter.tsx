"use client";

import { TagBadge } from "./TagBadge";

interface TagFilterProps {
  tags: string[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, activeTag, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Filter by tag:</span>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onSelect(activeTag === tag ? null : tag)}
            className="focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded-full"
          >
            <TagBadge tag={tag} active={activeTag === tag} size="md" />
          </button>
        ))}
        {activeTag && (
          <button
            onClick={() => onSelect(null)}
            className="ml-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
}
