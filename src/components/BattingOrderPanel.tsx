import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Game, Player } from '../types';
import { useAppStore } from '../store/useAppStore';
import { IconDown, IconDrag, IconUp } from './Icons';

interface RowProps {
  player: Player;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}

function Row({ player, index, total, onMove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: player.id });

  return (
    <li
      ref={setNodeRef}
      className={`bat__row ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className="bat__num">{index + 1}</span>
      <span className="bat__name">{player.name}</span>
      {player.uniform && <span className="bat__uni">#{player.uniform}</span>}

      <div className="bat__actions">
        <button
          className="iconbtn"
          aria-label={`Move ${player.name} up`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <IconUp />
        </button>
        <button
          className="iconbtn"
          aria-label={`Move ${player.name} down`}
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <IconDown />
        </button>
        {/* Dragging beats tapping up 12 times to move someone from 15th to 3rd;
            the arrows stay for precision and for keyboard use. */}
        <span
          className="bat__handle"
          aria-label={`Drag ${player.name} to reorder`}
          {...listeners}
          {...attributes}
        >
          <IconDrag />
        </span>
      </div>
    </li>
  );
}

interface Props {
  game: Game;
  /** Players at this game, already in batting order. */
  attending: Player[];
}

export function BattingOrderPanel({ game, attending }: Props) {
  const moveBatter = useAppStore((s) => s.moveBatter);
  const resetBattingOrder = useAppStore((s) => s.resetBattingOrder);
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = attending.findIndex((p) => p.id === active.id);
    const to = attending.findIndex((p) => p.id === over.id);
    if (from >= 0 && to >= 0) moveBatter(game.id, from, to);
  }

  return (
    <div className="bat">
      <button
        className="bat__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bat__label">
          Batting order
          <span className="bat__badge">
            {game.customOrder ? 'Custom' : 'Roster order'}
          </span>
        </span>
        <span className="bat__chev" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="bat__body">
          {attending.length === 0 ? (
            <p className="muted">Nobody is marked present for this game yet.</p>
          ) : (
            <>
              <p className="muted bat__note">
                {game.customOrder
                  ? 'This game has its own order. Changing the roster order no longer affects it.'
                  : 'Following the roster order. Reorder anyone below and this game keeps its own order from then on.'}
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={attending.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol className="bat__list">
                    {attending.map((p, i) => (
                      <Row
                        key={p.id}
                        player={p}
                        index={i}
                        total={attending.length}
                        onMove={(from, to) => moveBatter(game.id, from, to)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>

              {game.customOrder && (
                <div className="btn-row bat__reset">
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => resetBattingOrder(game.id)}
                  >
                    Reset to roster order
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
