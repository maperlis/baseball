import { useDraggable, useDroppable } from '@dnd-kit/core';
import { POSITIONS, POSITION_LABELS, type Player, type Position } from '../types';

/**
 * Slot centres in the 0–100 viewBox, laid out against the field below:
 * home plate at (50,88), the bases on a diamond out to second at (50,44).
 */
const SLOT_XY: Record<Position, { x: number; y: number }> = {
  CF: { x: 50, y: 25 },
  LF: { x: 20, y: 34 },
  RF: { x: 80, y: 34 },
  SS: { x: 35, y: 52 },
  '2B': { x: 65, y: 52 },
  '3B': { x: 24, y: 67 },
  '1B': { x: 76, y: 67 },
  P: { x: 50, y: 68 },
  C: { x: 50, y: 90 },
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
        {/* Fair territory: a wedge from home plate out to the fence arc. */}
        <path
          d="M50 88 L6 44 A 49 49 0 0 1 94 44 Z"
          fill="var(--ww-green-light)"
          opacity="0.30"
        />
        {/* Infield dirt, with the usual arc behind second. */}
        <path d="M50 95 L79 66 L50 37 L21 66 Z" fill="#C9A227" opacity="0.32" />
        {/* Infield grass inside the base paths. */}
        <path d="M50 82 L66 66 L50 50 L34 66 Z" fill="var(--ww-green-light)" opacity="0.45" />
        {/* Base paths. */}
        <path
          d="M50 88 L72 66 L50 44 L28 66 Z"
          stroke="var(--ww-white)"
          strokeWidth="0.8"
          fill="none"
          opacity="0.9"
        />
        {/* Foul lines, running past the bases to the fence. */}
        <path
          d="M50 88 L8 46 M50 88 L92 46"
          stroke="var(--ww-white)"
          strokeWidth="0.8"
          fill="none"
          opacity="0.75"
        />
        {/* Outfield fence. */}
        <path
          d="M6 44 A 49 49 0 0 1 94 44"
          stroke="var(--ww-white)"
          strokeWidth="0.9"
          fill="none"
          opacity="0.8"
        />
        {/* Bases and the pitcher's plate. */}
        <g fill="var(--ww-white)" opacity="0.95">
          <rect x="70.6" y="64.6" width="2.8" height="2.8" transform="rotate(45 72 66)" />
          <rect x="48.6" y="42.6" width="2.8" height="2.8" transform="rotate(45 50 44)" />
          <rect x="26.6" y="64.6" width="2.8" height="2.8" transform="rotate(45 28 66)" />
          <circle cx="50" cy="68" r="2.4" opacity="0.6" />
        </g>
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
