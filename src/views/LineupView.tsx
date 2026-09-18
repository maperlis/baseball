import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useAppStore } from '../store/useAppStore';
import { FIELD_SLOTS, type Player, type Position } from '../types';
import {
  attendingPlayers,
  benchCounts,
  benchPlayers,
  fieldedIds,
  incompleteInnings,
  positionOf,
} from '../lib/fairness';
import { AttendancePanel } from '../components/AttendancePanel';
// pdf.ts pulls in jsPDF (and its html2canvas dependency), roughly 250KB that
// nothing needs until the coach actually taps Export. Loaded on demand so the
// app shell stays light; the service worker still precaches the chunk, so
// exporting works offline.
import { FieldDiagram } from '../components/FieldDiagram';
import { BenchStrip } from '../components/BenchStrip';
import { InningTabs } from '../components/InningTabs';
import { LineupGrid } from '../components/LineupGrid';
import { FairnessPanel } from '../components/FairnessPanel';

type Mode = 'field' | 'grid';

export function LineupView({ onGoToGames }: { onGoToGames: () => void }) {
  const teamName = useAppStore((s) => s.teamName);
  const players = useAppStore((s) => s.players);
  const games = useAppStore((s) => s.games);
  const activeGameId = useAppStore((s) => s.activeGameId);
  const assignPlayer = useAppStore((s) => s.assignPlayer);
  const benchPlayerAction = useAppStore((s) => s.benchPlayer);
  const clearInning = useAppStore((s) => s.clearInning);
  const copyPreviousInning = useAppStore((s) => s.copyPreviousInning);
  const autoFill = useAppStore((s) => s.autoFill);

  const game = games.find((g) => g.id === activeGameId) ?? games[0] ?? null;

  const [inning, setInning] = useState(0);
  const [mode, setMode] = useState<Mode>('field');
  // Tap-to-assign: the player picked up by tapping, waiting for a destination.
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Player | null>(null);
  const [exporting, setExporting] = useState(false);

  const sensors = useSensors(
    // A small distance/delay stops a tap from registering as a drag, which is
    // what makes tap-to-assign and drag coexist on a touchscreen.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players],
  );

  if (!game) {
    return (
      <div className="card">
        <div className="empty">
          <p>No game yet.</p>
          <button className="btn" onClick={onGoToGames}>
            Create a game
          </button>
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          Add players to your roster before building a lineup.
        </div>
      </div>
    );
  }

  const safeInning = Math.min(inning, game.innings - 1);
  const current = game.assignments[safeInning] ?? {};
  // Everything below counts only the players at THIS game. Using the full
  // roster would score absent kids as sitting the bench all afternoon.
  const attending = attendingPlayers(game, players);
  const bench = benchPlayers(game, attending, safeInning);
  const counts = benchCounts(game, attending);
  const complete = new Set(
    Array.from({ length: game.innings }, (_, i) => i).filter(
      (i) => fieldedIds(game, i).length >= FIELD_SLOTS,
    ),
  );
  const missing = incompleteInnings(game);
  const shortRoster = attending.length < FIELD_SLOTS;

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith('player:')) {
      setDragging(playersById[id.slice(7)] ?? null);
    } else if (id.startsWith('from:')) {
      setDragging(playersById[id.slice(5)] ?? null);
    }
    setPendingPlayerId(null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null);
    const over = e.over;
    if (!over) return;
    const activeId = String(e.active.id);
    const playerId = activeId.startsWith('player:')
      ? activeId.slice(7)
      : activeId.startsWith('from:')
        ? activeId.slice(5)
        : null;
    if (!playerId) return;

    const overId = String(over.id);
    if (overId === 'bench') {
      benchPlayerAction(game!.id, safeInning, playerId);
    } else if (overId.startsWith('pos:')) {
      assignPlayer(game!.id, safeInning, overId.slice(4) as Position, playerId);
    }
  }

  /** Tap a bench player, then tap a position. Tap a filled position to pick that player up. */
  function handleTapSlot(position: Position) {
    if (pendingPlayerId) {
      assignPlayer(game!.id, safeInning, position, pendingPlayerId);
      setPendingPlayerId(null);
      return;
    }
    const occupant = current[position];
    if (occupant) setPendingPlayerId(occupant);
  }

  function handleTapBenchPlayer(playerId: string) {
    if (pendingPlayerId === playerId) {
      setPendingPlayerId(null);
      return;
    }
    // A fielder was picked up, then a bench player tapped → take the fielder out.
    if (pendingPlayerId && positionOf(game!, safeInning, pendingPlayerId)) {
      benchPlayerAction(game!.id, safeInning, pendingPlayerId);
      setPendingPlayerId(null);
      return;
    }
    setPendingPlayerId(playerId);
  }

  const selectedPosition = pendingPlayerId
    ? positionOf(game, safeInning, pendingPlayerId)
    : null;

  return (
    <>
      <div className="lineup__bar">
        <button className="lineup__game" onClick={onGoToGames}>
          <span className="lineup__gamename">{game.name}</span>
          <span className="lineup__gamedate">{game.date}</span>
        </button>
        <div className="seg" role="group" aria-label="View mode">
          <button
            className={`seg__btn ${mode === 'field' ? 'is-on' : ''}`}
            onClick={() => setMode('field')}
          >
            Field
          </button>
          <button
            className={`seg__btn ${mode === 'grid' ? 'is-on' : ''}`}
            onClick={() => setMode('grid')}
          >
            Grid
          </button>
        </div>
      </div>

      <AttendancePanel game={game} allPlayers={players} />

      {shortRoster && (
        <p className="notice">
          Only {attending.length} player{attending.length === 1 ? '' : 's'} at
          this game — {FIELD_SLOTS} are needed to fill the field.
        </p>
      )}

      <InningTabs
        innings={game.innings}
        current={safeInning}
        completeInnings={complete}
        onSelect={(i) => {
          setInning(i);
          setPendingPlayerId(null);
        }}
      />

      {mode === 'field' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {pendingPlayerId && (
            <p className="notice notice--action">
              {playersById[pendingPlayerId]?.name} selected — tap a position to
              place.{' '}
              <button className="linkbtn" onClick={() => setPendingPlayerId(null)}>
                Cancel
              </button>
            </p>
          )}

          <FieldDiagram
            assignments={current}
            playersById={playersById}
            pendingPlayerId={pendingPlayerId}
            selectedPosition={selectedPosition}
            onTapSlot={handleTapSlot}
          />

          <BenchStrip
            bench={bench}
            benchCounts={counts}
            pendingPlayerId={pendingPlayerId}
            onTapPlayer={handleTapBenchPlayer}
          />

          <DragOverlay>
            {dragging ? <div className="chip chip--overlay">{dragging.name}</div> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <LineupGrid
          game={game}
          players={attending}
          currentInning={safeInning}
          onSelectInning={setInning}
          onSetCell={(i, playerId, value) => {
            if (value === 'OUT') benchPlayerAction(game.id, i, playerId);
            else assignPlayer(game.id, i, value, playerId);
          }}
        />
      )}

      <FairnessPanel game={game} players={attending} />

      <div className="card">
        <div className="btn-row">
          <button
            className="btn"
            onClick={() => {
              const filled = Object.keys(game.assignments).length > 0;
              if (
                !filled ||
                confirm('Replace the whole lineup with a suggested one?')
              ) {
                autoFill(game.id);
              }
            }}
          >
            Auto-fill game
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => autoFill(game.id, { fillRemainingOnly: true })}
          >
            Fill empty innings
          </button>
          <button
            className="btn btn--secondary"
            disabled={safeInning === 0}
            onClick={() => copyPreviousInning(game.id, safeInning)}
          >
            {safeInning === 0 ? 'Copy previous' : `Copy inning ${safeInning}`}
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => clearInning(game.id, safeInning)}
          >
            Clear inning
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Export</div>
        {missing.length > 0 && (
          <p className="notice">
            {missing.length === 1
              ? `Inning ${missing[0] + 1} is not full yet.`
              : `Innings ${missing.map((i) => i + 1).join(', ')} are not full yet.`}{' '}
            You can still export — empty spots print as OUT.
          </p>
        )}
        <button
          className="btn"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              const { exportLineupPdf } = await import('../lib/pdf');
              exportLineupPdf(teamName, game, players);
            } finally {
              setExporting(false);
            }
          }}
        >
          {exporting ? 'Preparing…' : 'Export lineup PDF'}
        </button>
      </div>
    </>
  );
}
