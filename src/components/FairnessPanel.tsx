import { useState } from 'react';
import type { Game, Player } from '../types';
import { benchCounts, fairnessWarnings } from '../lib/fairness';

interface Props {
  game: Game;
  players: Player[];
}

/**
 * The answer to "why did my kid sit three innings?" — bench counts and the
 * specific problems, in one place, readable at a glance in a dugout.
 */
export function FairnessPanel({ game, players }: Props) {
  const [open, setOpen] = useState(false);
  const counts = benchCounts(game, players);
  const warnings = fairnessWarnings(game, players);
  const byPlayer = new Map<string, string[]>();
  for (const w of warnings) {
    if (!byPlayer.has(w.playerId)) byPlayer.set(w.playerId, []);
    byPlayer.get(w.playerId)!.push(w.message);
  }

  const blocking = warnings.filter((w) => w.severity === 'warn').length;
  const sorted = [...players].sort(
    (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0),
  );

  return (
    <div className={`fair ${blocking > 0 ? 'fair--warn' : ''}`}>
      <button
        className="fair__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fair__label">
          Fair play
          {blocking > 0 ? (
            <span className="fair__badge">{blocking}</span>
          ) : (
            <span className="fair__ok" aria-hidden="true">
              ✓
            </span>
          )}
        </span>
        <span className="fair__chev" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="fair__body">
          {players.length === 0 && <p className="muted">No players yet.</p>}

          {blocking === 0 && players.length > 0 && (
            <p className="muted">
              Bench time is spread evenly and nobody sits back to back.
            </p>
          )}

          <ul className="fair__list">
            {sorted.map((p) => {
              const msgs = byPlayer.get(p.id) ?? [];
              return (
                <li key={p.id} className="fair__row">
                  <span className="fair__name">{p.name}</span>
                  <span className="fair__count">
                    {counts[p.id] ?? 0} out
                  </span>
                  {msgs.length > 0 && (
                    <ul className="fair__msgs">
                      {msgs.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
