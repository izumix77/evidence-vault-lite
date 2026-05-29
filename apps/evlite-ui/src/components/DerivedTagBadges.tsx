import type { DerivedTag } from "../types";

type Props = {
  tags: DerivedTag[];
};

export function DerivedTagBadges({ tags }: Props) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="derived-tags">
      <span className="derived-tags-label">Derived:</span>
      {tags.map((t) => (
        <span key={t} className={`derived-tag derived-tag-${t}`}>
          {t}
        </span>
      ))}
    </div>
  );
}
