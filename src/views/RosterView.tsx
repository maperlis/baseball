import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { IconDelete, IconDown, IconEdit, IconUp } from '../components/Icons';
import { MAX_PLAYERS } from '../types';

export function RosterView() {
  const teamName = useAppStore((s) => s.teamName);
  const setTeamName = useAppStore((s) => s.setTeamName);
  const players = useAppStore((s) => s.players);
  const addPlayer = useAppStore((s) => s.addPlayer);
  const updatePlayer = useAppStore((s) => s.updatePlayer);
  const removePlayer = useAppStore((s) => s.removePlayer);
  const movePlayer = useAppStore((s) => s.movePlayer);

  const [name, setName] = useState('');
  const [uniform, setUniform] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const full = players.length >= MAX_PLAYERS;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = addPlayer(name, uniform);
    if (!res.ok) {
      setError(res.error ?? 'Could not add player.');
      return;
    }
    setName('');
    setUniform('');
    setError(null);
  }

  return (
    <>
      <div className="card">
        <div className="section-title">Team</div>
        <input
          className="input"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team name"
          aria-label="Team name"
        />
        <p className="muted" style={{ marginBottom: 0 }}>
          Appears on the exported lineup card.
        </p>
      </div>

      <div className="card">
        <div className="section-title">
          Roster · {players.length} / {MAX_PLAYERS}
        </div>

        <form onSubmit={submit} className="roster__add">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            aria-label="Player name"
            disabled={full}
          />
          <input
            className="input roster__uniform"
            value={uniform}
            onChange={(e) => setUniform(e.target.value)}
            placeholder="#"
            aria-label="Uniform number"
            inputMode="numeric"
            disabled={full}
          />
          <button className="btn" type="submit" disabled={full}>
            Add
          </button>
        </form>

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>
            {error}
          </p>
        )}
        {full && (
          <p className="muted">
            Roster is full. Remove a player to add another.
          </p>
        )}

        {players.length === 0 ? (
          <div className="empty">
            No players yet. Add your roster to get started — batting order
            follows this list.
          </div>
        ) : (
          <ol className="roster">
            {players.map((p, i) => (
              <li key={p.id} className="roster__row">
                <span className="roster__order">{i + 1}</span>

                {editingId === p.id ? (
                  <>
                    <input
                      className="input"
                      value={p.name}
                      aria-label={`Name for ${p.name}`}
                      onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                    />
                    <input
                      className="input roster__uniform"
                      value={p.uniform}
                      aria-label={`Uniform number for ${p.name}`}
                      inputMode="numeric"
                      onChange={(e) => updatePlayer(p.id, { uniform: e.target.value })}
                    />
                    <button
                      className="btn btn--sm"
                      onClick={() => setEditingId(null)}
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <span className="roster__name">{p.name}</span>
                    <span className="roster__num">{p.uniform || '—'}</span>
                    <div className="roster__actions">
                      <button
                        className="iconbtn"
                        aria-label={`Move ${p.name} up`}
                        disabled={i === 0}
                        onClick={() => movePlayer(i, i - 1)}
                      >
                        <IconUp />
                      </button>
                      <button
                        className="iconbtn"
                        aria-label={`Move ${p.name} down`}
                        disabled={i === players.length - 1}
                        onClick={() => movePlayer(i, i + 1)}
                      >
                        <IconDown />
                      </button>
                      <button
                        className="iconbtn"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditingId(p.id)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="iconbtn iconbtn--danger"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => {
                          if (confirm(`Remove ${p.name} from the roster?`)) {
                            removePlayer(p.id);
                          }
                        }}
                      >
                        <IconDelete />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
