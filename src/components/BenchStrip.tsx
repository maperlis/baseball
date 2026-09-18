import { useDroppable } from '@dnd-kit/core';
import type { Player } from '../types';
import { PlayerChip } from './PlayerChip';

interface Props {
  bench: Player[];
  benchCounts: Record<string, number>;
  pendingPlayerId: string | null;
  onTapPlayer: (playerId: string) => void;
}

export function BenchStrip({ bench, benchCounts, pendingPlayerId, onTapPlayer }: Props) {
  // Dropping a fielder here takes them out of the field for this inning.
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });

  return (
    <div
      ref={setNodeRef}
      className={`bench ${isOver ? 'bench--over' : ''}`}
      aria-label="Bench"
    >
      <div className="bench__head">
        <span className="section-title" style={{ marginBottom: 0 }}>
          Bench · {bench.length}
        </span>
        <span className="bench__hint">
          Number = innings sat this game
        </span>
      </div>

      {bench.length === 0 ? (
        <div className="bench__empty">Everyone is in the field this inning.</div>
      ) : (
        <div className="bench__list">
          {bench.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              benchCount={benchCounts[p.id] ?? 0}
              selected={pendingPlayerId === p.id}
              onTap={onTapPlayer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
