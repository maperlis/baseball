import { useDraggable } from '@dnd-kit/core';
import type { Player } from '../types';

interface Props {
  player: Player;
  benchCount: number;
  selected: boolean;
  onTap: (playerId: string) => void;
}

export function PlayerChip({ player, benchCount, selected, onTap }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player:${player.id}`,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        'chip',
        selected ? 'chip--selected' : '',
        isDragging ? 'chip--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={selected}
      aria-label={`${player.name}, benched ${benchCount} inning${benchCount === 1 ? '' : 's'}`}
      onClick={() => onTap(player.id)}
    >
      <span className="chip__name">{player.name}</span>
      {player.uniform && <span className="chip__num">#{player.uniform}</span>}
      <span
        className={benchCount > 0 ? 'chip__bench chip__bench--on' : 'chip__bench'}
        title="Innings on the bench"
      >
        {benchCount}
      </span>
    </button>
  );
}
