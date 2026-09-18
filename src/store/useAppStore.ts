import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  DEFAULT_INNINGS,
  MAX_PLAYERS,
  POSITIONS,
  type Game,
  type Player,
  type Position,
} from '../types';
import { newId, todayISO } from '../lib/ids';
import { pruneAssignments } from '../lib/fairness';
import { suggestLineup, type AutofillOptions } from '../lib/autofill';

export const STORAGE_KEY = 'ww-lineup-v1';

/**
 * localStorage is absent under test and throws outright in private browsing or
 * with site data blocked. Fall back to an in-memory map so the app still runs —
 * the season just won't survive a reload, which beats a blank screen.
 */
function safeStorage(): StateStorage {
  const memory = new Map<string, string>();
  let usable = false;
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__ww_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      usable = true;
    }
  } catch {
    usable = false;
  }

  if (!usable) {
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    };
  }

  return {
    getItem: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        memory.set(k, v);
      }
    },
    removeItem: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        memory.delete(k);
      }
    },
  };
}

/** True when saved data will actually survive a reload on this device. */
export function storageIsPersistent(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__ww_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export interface AppState {
  teamName: string;
  players: Player[];
  games: Game[];
  activeGameId: string | null;

  setTeamName: (name: string) => void;

  addPlayer: (name: string, uniform: string) => { ok: boolean; error?: string };
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void;
  removePlayer: (id: string) => void;
  movePlayer: (from: number, to: number) => void;

  setAttendance: (gameId: string, playerIds: string[]) => void;
  togglePlayerAttendance: (gameId: string, playerId: string) => void;
  setAllAttending: (gameId: string, attending: boolean) => void;

  createGame: (name: string, date?: string) => string;
  duplicateGame: (id: string) => string | null;
  renameGame: (id: string, name: string, date: string) => void;
  deleteGame: (id: string) => void;
  setInnings: (id: string, innings: number) => void;
  setActiveGame: (id: string | null) => void;

  assignPlayer: (
    gameId: string,
    inning: number,
    position: Position,
    playerId: string,
  ) => void;
  clearPosition: (gameId: string, inning: number, position: Position) => void;
  benchPlayer: (gameId: string, inning: number, playerId: string) => void;
  clearInning: (gameId: string, inning: number) => void;
  copyPreviousInning: (gameId: string, inning: number) => void;
  autoFill: (gameId: string, options?: AutofillOptions) => void;

  replaceAll: (data: Pick<AppState, 'teamName' | 'players' | 'games'>) => void;
}

function withGame(games: Game[], id: string, fn: (g: Game) => Game): Game[] {
  return games.map((g) => (g.id === id ? fn(g) : g));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      teamName: 'Westwood',
      players: [],
      games: [],
      activeGameId: null,

      setTeamName: (name) => set({ teamName: name }),

      addPlayer: (name, uniform) => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, error: 'Enter a player name.' };
        const { players } = get();
        if (players.length >= MAX_PLAYERS) {
          return { ok: false, error: `Roster is full (${MAX_PLAYERS} players).` };
        }
        const player: Player = { id: newId(), name: trimmed, uniform: uniform.trim() };
        set({
          players: [...players, player],
          // A late roster addition joins games that haven't been built yet.
          // Games with a lineup already in them are left alone — adding a kid
          // to the roster in week 6 shouldn't quietly rewrite week 3.
          games: get().games.map((g) =>
            Object.keys(g.assignments).length === 0
              ? { ...g, battingOrder: [...g.battingOrder, player.id] }
              : g,
          ),
        });
        return { ok: true };
      },

      updatePlayer: (id, patch) =>
        set({
          players: get().players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }),

      removePlayer: (id) => {
        const players = get().players.filter((p) => p.id !== id);
        const validIds = new Set(players.map((p) => p.id));
        set({
          players,
          games: get().games.map((g) => ({
            ...g,
            battingOrder: g.battingOrder.filter((pid) => pid !== id),
            assignments: pruneAssignments(g.assignments, g.innings, validIds),
          })),
        });
      },

      movePlayer: (from, to) => {
        const players = [...get().players];
        if (from < 0 || from >= players.length || to < 0 || to >= players.length) return;
        const [moved] = players.splice(from, 1);
        players.splice(to, 0, moved);
        const order = players.map((p) => p.id);
        set({
          players,
          // Batting order follows roster order, but only among the players who
          // are actually at each game — reordering the roster must not drag
          // absent kids back into a lineup.
          games: get().games.map((g) => {
            const here = new Set(g.battingOrder);
            return { ...g, battingOrder: order.filter((id) => here.has(id)) };
          }),
        });
      },

      /**
       * Attendance is the batting order. Setting it re-sorts into roster order
       * so the card reads top-to-bottom the way the coach arranged the roster,
       * and drops any assignment belonging to a player who is no longer here.
       */
      setAttendance: (gameId, playerIds) =>
        set({
          games: withGame(get().games, gameId, (g) => {
            const wanted = new Set(playerIds);
            const order = get()
              .players.map((p) => p.id)
              .filter((id) => wanted.has(id));
            return {
              ...g,
              battingOrder: order,
              assignments: pruneAssignments(g.assignments, g.innings, new Set(order)),
            };
          }),
        }),

      togglePlayerAttendance: (gameId, playerId) => {
        const game = get().games.find((g) => g.id === gameId);
        if (!game) return;
        const here = game.battingOrder.includes(playerId);
        const next = here
          ? game.battingOrder.filter((id) => id !== playerId)
          : [...game.battingOrder, playerId];
        get().setAttendance(gameId, next);
      },

      setAllAttending: (gameId, attending) =>
        get().setAttendance(gameId, attending ? get().players.map((p) => p.id) : []),

      createGame: (name, date) => {
        const game: Game = {
          id: newId(),
          name: name.trim() || 'New game',
          date: date || todayISO(),
          innings: DEFAULT_INNINGS,
          battingOrder: get().players.map((p) => p.id),
          assignments: {},
        };
        set({ games: [game, ...get().games], activeGameId: game.id });
        return game.id;
      },

      duplicateGame: (id) => {
        const src = get().games.find((g) => g.id === id);
        if (!src) return null;
        const copy: Game = {
          ...src,
          id: newId(),
          name: `${src.name} (copy)`,
          date: todayISO(),
          battingOrder: [...src.battingOrder],
          assignments: JSON.parse(JSON.stringify(src.assignments)),
        };
        set({ games: [copy, ...get().games], activeGameId: copy.id });
        return copy.id;
      },

      renameGame: (id, name, date) =>
        set({
          games: withGame(get().games, id, (g) => ({
            ...g,
            name: name.trim() || g.name,
            date: date || g.date,
          })),
        }),

      deleteGame: (id) => {
        const games = get().games.filter((g) => g.id !== id);
        set({
          games,
          activeGameId: get().activeGameId === id ? (games[0]?.id ?? null) : get().activeGameId,
        });
      },

      setInnings: (id, innings) => {
        const n = Math.max(1, Math.min(12, Math.round(innings)));
        set({
          games: withGame(get().games, id, (g) => ({
            ...g,
            innings: n,
            assignments: pruneAssignments(
              g.assignments,
              n,
              new Set(get().players.map((p) => p.id)),
            ),
          })),
        });
      },

      setActiveGame: (id) => set({ activeGameId: id }),

      /**
       * Swap-aware. If the incoming player already holds another position this
       * inning, the two trade places rather than leaving the player duplicated.
       * Every drag, drop and tap in the UI routes through here, which is what
       * keeps the field view and the grid view from ever disagreeing.
       */
      assignPlayer: (gameId, inning, position, playerId) =>
        set({
          games: withGame(get().games, gameId, (g) => {
            const inn = { ...(g.assignments[inning] ?? {}) };
            const displaced = inn[position];
            if (displaced === playerId) return g;

            const previous = POSITIONS.find((p) => inn[p] === playerId) ?? null;

            inn[position] = playerId;
            if (previous) {
              if (displaced) {
                inn[previous] = displaced; // straight swap
              } else {
                delete inn[previous]; // moved from the field to an empty slot
              }
            }
            // If the player came off the bench, `displaced` simply returns to it.

            return { ...g, assignments: { ...g.assignments, [inning]: inn } };
          }),
        }),

      clearPosition: (gameId, inning, position) =>
        set({
          games: withGame(get().games, gameId, (g) => {
            const inn = { ...(g.assignments[inning] ?? {}) };
            delete inn[position];
            return { ...g, assignments: { ...g.assignments, [inning]: inn } };
          }),
        }),

      benchPlayer: (gameId, inning, playerId) =>
        set({
          games: withGame(get().games, gameId, (g) => {
            const inn = { ...(g.assignments[inning] ?? {}) };
            for (const p of POSITIONS) {
              if (inn[p] === playerId) delete inn[p];
            }
            return { ...g, assignments: { ...g.assignments, [inning]: inn } };
          }),
        }),

      clearInning: (gameId, inning) =>
        set({
          games: withGame(get().games, gameId, (g) => {
            const next = { ...g.assignments };
            delete next[inning];
            return { ...g, assignments: next };
          }),
        }),

      copyPreviousInning: (gameId, inning) =>
        set({
          games: withGame(get().games, gameId, (g) => {
            if (inning <= 0) return g;
            const prev = g.assignments[inning - 1];
            if (!prev) return g;
            return {
              ...g,
              assignments: { ...g.assignments, [inning]: { ...prev } },
            };
          }),
        }),

      autoFill: (gameId, options) =>
        set({
          games: withGame(get().games, gameId, (g) => ({
            ...g,
            assignments: suggestLineup(g, get().players, options),
          })),
        }),

      replaceAll: (data) =>
        set({
          teamName: data.teamName,
          players: data.players,
          games: data.games,
          activeGameId: data.games[0]?.id ?? null,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(safeStorage),
    },
  ),
);
