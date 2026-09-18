import { useRef, useState } from 'react';
import { storageIsPersistent, useAppStore } from '../store/useAppStore';
import { isGameComplete } from '../lib/fairness';
import { todayISO } from '../lib/ids';
import type { Game, Player } from '../types';

interface BackupShape {
  teamName: string;
  players: Player[];
  games: Game[];
}

export function GamesView({ onOpenLineup }: { onOpenLineup: () => void }) {
  const teamName = useAppStore((s) => s.teamName);
  const games = useAppStore((s) => s.games);
  const players = useAppStore((s) => s.players);
  const activeGameId = useAppStore((s) => s.activeGameId);
  const createGame = useAppStore((s) => s.createGame);
  const duplicateGame = useAppStore((s) => s.duplicateGame);
  const renameGame = useAppStore((s) => s.renameGame);
  const deleteGame = useAppStore((s) => s.deleteGame);
  const setInnings = useAppStore((s) => s.setInnings);
  const setActiveGame = useAppStore((s) => s.setActiveGame);
  const replaceAll = useAppStore((s) => s.replaceAll);

  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    createGame(name || `Game ${games.length + 1}`, date);
    setName('');
    setDate(todayISO());
    onOpenLineup();
  }

  function exportBackup() {
    const data: BackupShape = { teamName, players, games };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `westwood-lineup-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupShape;
        if (!Array.isArray(parsed.players) || !Array.isArray(parsed.games)) {
          throw new Error('missing players or games');
        }
        if (
          !confirm(
            `Replace the current roster and ${games.length} saved game(s) with this backup?`,
          )
        ) {
          return;
        }
        replaceAll({
          teamName: parsed.teamName || 'Westwood',
          players: parsed.players,
          games: parsed.games,
        });
        setImportError(null);
      } catch {
        setImportError("That file isn't a valid lineup backup.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <div className="card">
        <div className="section-title">New game</div>
        <form onSubmit={create} className="games__new">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="vs Sharks"
            aria-label="Game name"
          />
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Game date"
          />
          <button className="btn" type="submit">
            Create
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-title">Saved games · {games.length}</div>
        {games.length === 0 ? (
          <div className="empty">No games yet.</div>
        ) : (
          <ul className="games">
            {games.map((g) => {
              const done = isGameComplete(g);
              const isActive = g.id === activeGameId;
              return (
                <li key={g.id} className={`games__row ${isActive ? 'is-active' : ''}`}>
                  {editingId === g.id ? (
                    <div className="games__edit">
                      <input
                        className="input"
                        value={g.name}
                        aria-label="Game name"
                        onChange={(e) => renameGame(g.id, e.target.value, g.date)}
                      />
                      <input
                        className="input"
                        type="date"
                        value={g.date}
                        aria-label="Game date"
                        onChange={(e) => renameGame(g.id, g.name, e.target.value)}
                      />
                      <label className="games__innings">
                        Innings
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={12}
                          value={g.innings}
                          onChange={(e) => setInnings(g.id, Number(e.target.value))}
                        />
                      </label>
                      <button className="btn btn--sm" onClick={() => setEditingId(null)}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="games__open"
                        onClick={() => {
                          setActiveGame(g.id);
                          onOpenLineup();
                        }}
                      >
                        <span className="games__name">
                          {g.name}
                          {done && (
                            <span className="games__done" aria-label="Complete">
                              ✓
                            </span>
                          )}
                        </span>
                        <span className="games__meta">
                          {g.date} · {g.innings} innings
                        </span>
                      </button>
                      <div className="games__actions">
                        <button
                          className="iconbtn"
                          aria-label={`Edit ${g.name}`}
                          onClick={() => setEditingId(g.id)}
                        >
                          ✎
                        </button>
                        <button
                          className="iconbtn"
                          aria-label={`Duplicate ${g.name}`}
                          onClick={() => duplicateGame(g.id)}
                        >
                          ⧉
                        </button>
                        <button
                          className="iconbtn iconbtn--danger"
                          aria-label={`Delete ${g.name}`}
                          onClick={() => {
                            if (confirm(`Delete "${g.name}"?`)) deleteGame(g.id);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="section-title">Backup</div>
        {!storageIsPersistent() && (
          <p className="notice">
            This browser is blocking local storage, so nothing will be saved when
            you close the app. Export a backup before you leave, or turn off
            private browsing.
          </p>
        )}
        <p className="muted">
          Everything is stored on this device only. Clearing your browser data or
          switching phones will lose the season — export a backup file now and
          then to be safe.
        </p>
        {importError && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>
            {importError}
          </p>
        )}
        <div className="btn-row">
          <button className="btn btn--secondary" onClick={exportBackup}>
            Export backup
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => fileRef.current?.click()}
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </>
  );
}
