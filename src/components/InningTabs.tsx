interface Props {
  innings: number;
  current: number;
  /** Inning indices that have all 9 positions filled. */
  completeInnings: Set<number>;
  onSelect: (inning: number) => void;
}

export function InningTabs({ innings, current, completeInnings, onSelect }: Props) {
  return (
    <div className="innings" role="tablist" aria-label="Innings">
      {Array.from({ length: innings }).map((_, i) => {
        const done = completeInnings.has(i);
        return (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Inning ${i + 1}${done ? ', complete' : ', incomplete'}`}
            className={`inning ${i === current ? 'inning--active' : ''} ${
              done ? 'inning--done' : ''
            }`}
            onClick={() => onSelect(i)}
          >
            <span className="inning__n">{i + 1}</span>
            {/* Completion is shown with a check glyph, not colour alone — the
                brand green is already the UI's chrome, so a green dot would
                disappear against it. */}
            <span className="inning__state" aria-hidden="true">
              {done ? '✓' : '·'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
