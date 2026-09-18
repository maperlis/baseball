import { useDraggable, useDroppable } from '@dnd-kit/core';
import { POSITIONS, POSITION_LABELS, type Player, type Position } from '../types';

/** Slot centres in the 0–100 viewBox. Tuned to read as a real field on a phone. */
const SLOT_XY: Record<Position, { x: number; y: number }> = {
  CF: { x: 50, y: 20 },
  LF: { x: 19, y: 30 },
  RF: { x: 81, y: 30 },
  SS: { x: 36, y: 46 },
  '2B': { x: 64, y: 46 },
  '3B': { x: 22, y: 62 },
  '1B': { x: 78, y: 62 },
  P: { x: 50, y: 58 },
  C: { x: 50, y: 84 },
};

interface SlotProps {
  position: Position;
  player: Player | null;
  selected: boolean;
  isPendingTarget: boolean;
  onTap: (position: Position) => void;
}

function Slot({ position, player, selected, isPendingTarget, onTap }: SlotProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `pos:${position}` });
  // A filled slot is also a drag source, so a player can be moved straight from
  // one position to another without a trip through the bench.
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: `from:${player?.id ?? position}`, disabled: !player });

  const { x, y } = SLOT_XY[position];

  const cls = [
    'slot',
    player ? 'slot--filled' : 'slot--empty',
    isOver ? 'slot--over' : '',
    selected ? 'slot--selected' : '',
    isPendingTarget ? 'slot--target' : '',
    isDragging ? 'slot--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const label = player
    ? `${POSITION_LABELS[position]}: ${player.name}`
    : `${POSITION_LABELS[position]}: empty`;

  return (
    <div
      ref={(node) => {
        setDropRef(node);
        setDragRef(node);
      }}
      {...(player ? listeners : {})}
      {...(player ? attributes : {})}
      className={cls}
      style={{ left: `${x}%`, top: `${y}%` }}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onTap(position)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(position);
        }
      }}
    >
      <span className="slot__pos">{position}</span>
      <span className="slot__name">
        {player ? player.name : <span className="slot__dash">—</span>}
      </span>
    </div>
  );
}

interface Props {
  assignments: Partial<Record<Position, string>>;
  playersById: Record<string, Player>;
  /** Player currently picked up via tap, awaiting a destination. */
  pendingPlayerId: string | null;
  selectedPosition: Position | null;
  onTapSlot: (position: Position) => void;
}

export function FieldDiagram({
  assignments,
  playersById,
  pendingPlayerId,
  selectedPosition,
  onTapSlot,
}: Props) {
  return (
    <div className="field">
      <svg className="field__bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {/* Outfield grass */}
        <path d="M2 74 A 62 62 0 0 1 98 74 L98 98 L2 98 Z" fill="var(--ww-green-light)" opacity="0.28" />
        {/* Infield dirt */}
        <path d="M50 92 L18 60 L50 28 L82 60 Z" fill="#C9A227" opacity="0.30" />
        {/* Infield grass */}
        <path d="M50 84 L26 60 L50 36 L74 60 Z" fill="var(--ww-green-light)" opacity="0.40" />
        {/* Baselines */}
        <path
          d="M50 92 L18 60 M50 92 L82 60"
          stroke="var(--ww-white)"
          strokeWidth="0.7"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M50 92 L18 60 L50 28 L82 60 Z"
          stroke="var(--ww-white)"
          strokeWidth="0.7"
          fill="none"
          opacity="0.6"
        />
        {/* Outfield fence */}
        <path
          d="M4 74 A 60 60 0 0 1 96 74"
          stroke="var(--ww-white)"
          strokeWidth="0.7"
          fill="none"
          opacity="0.7"
        />
      </svg>

      {POSITIONS.map((pos) => {
        const id = assignments[pos];
        return (
          <Slot
            key={pos}
            position={pos}
            player={id ? (playersById[id] ?? null) : null}
            selected={selectedPosition === pos}
            isPendingTarget={pendingPlayerId !== null}
            onTap={onTapSlot}
          />
        );
      })}
    </div>
  );
}
