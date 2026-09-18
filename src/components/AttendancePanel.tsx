import { useState } from 'react';
import { FIELD_SLOTS, type Game, type Player } from '../types';
import { useAppStore } from '../store/useAppStore';

interface Props {
  game: Game;
  /** The full roster, not just who's here. */
  allPlayers: Player[];
}

/**
 * Who showed up. Defaults to the whole roster, so a coach who never opens this
 * panel gets the old behaviour; unchecking a player pulls them out of the
 * batting order and out of any inning they were already placed in.
 */
export function AttendancePanel({ game, allPlayers }: Props) {
  const toggle = useAppStore((s) => s.togglePlayerAttendance);
  const setAll = useAppStore((s) => s.setAllAttending);

  const here = new Set(game.battingOrder);
  const count = here.size;
  const short = count < FIELD_SLOTS;

  // Opens automatically when there aren't enough kids to field a team — that
  // is nearly always an attendance problem, not a lineup one.
  const [open, setOpen] = useState(short);

  return (
    <div className={`att ${short ? 'att--short' : ''}`}>
      <button
        className="att__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="att__label">
          Attendance
          <span className="att__count">
            {count} of {allPlayers.length}
          </span>
        </span>
        <span className="att__chev" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="att__body">
          {short && (
            <p className="notice">
              Only {count} player{count === 1 ? '' : 's'} marked present.{' '}
              {FIELD_SLOTS} are needed to fill the field — the empty spots will
              print as OUT.
            </p>
          )}

          <div className="btn-row att__bulk">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setAll(game.id, true)}
            >
              All present
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                if (
                  Object.keys(game.assignments).length === 0 ||
                  confirm('Clear attendance? This also empties the lineup.')
                ) {
                  setAll(game.id, false);
                }
              }}
            >
              Clear all
            </button>
          </div>

          <ul className="att__list">
            {allPlayers.map((p) => {
              const present = here.has(p.id);
              return (
                <li key={p.id}>
                  <label className={`att__row ${present ? 'is-here' : ''}`}>
                    <input
                      type="checkbox"
                      className="att__check"
                      checked={present}
                      onChange={() => toggle(game.id, p.id)}
                    />
                    <span className="att__name">{p.name}</span>
                    {p.uniform && <span className="att__num">#{p.uniform}</span>}
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="muted att__note">
            Unchecking a player removes them from the batting order and from any
            inning they were already assigned to.
          </p>
        </div>
      )}
    </div>
  );
}
