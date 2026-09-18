import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { fieldedIds, positionOf } from '../fairness';
import { MAX_PLAYERS } from '../../types';

function reset() {
  useAppStore.setState({
    teamName: 'Westwood',
    players: [],
    games: [],
    activeGameId: null,
  });
}

function seed(n: number) {
  reset();
  const s = useAppStore.getState();
  for (let i = 1; i <= n; i++) s.addPlayer(`Player ${i}`, String(i));
  return useAppStore.getState().createGame('Test', '2026-09-17');
}

describe('roster', () => {
  beforeEach(reset);

  it('caps the roster at 20 players', () => {
    const s = useAppStore.getState();
    for (let i = 0; i < MAX_PLAYERS; i++) s.addPlayer(`P${i}`, '');
    const res = useAppStore.getState().addPlayer('One too many', '');
    expect(res.ok).toBe(false);
    expect(useAppStore.getState().players).toHaveLength(MAX_PLAYERS);
  });

  it('rejects a blank name', () => {
    expect(useAppStore.getState().addPlayer('   ', '1').ok).toBe(false);
  });

  it('removes a player from the batting order and every assignment', () => {
    const gameId = seed(10);
    const st = useAppStore.getState();
    const victim = st.players[0].id;
    st.assignPlayer(gameId, 0, 'SS', victim);
    useAppStore.getState().removePlayer(victim);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).not.toContain(victim);
    expect(fieldedIds(game, 0)).not.toContain(victim);
  });
});

describe('assignPlayer', () => {
  beforeEach(reset);

  it('places a bench player into an empty position', () => {
    const gameId = seed(12);
    const p = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(gameId, 0, 'C', p);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(game, 0, p)).toBe('C');
  });

  it('swaps two fielders instead of duplicating either', () => {
    const gameId = seed(12);
    const [a, b] = useAppStore.getState().players.map((p) => p.id);
    const s = useAppStore.getState();
    s.assignPlayer(gameId, 0, 'P', a);
    s.assignPlayer(gameId, 0, 'C', b);
    // Move A onto C, which B holds — they should trade places.
    useAppStore.getState().assignPlayer(gameId, 0, 'C', a);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(game, 0, a)).toBe('C');
    expect(positionOf(game, 0, b)).toBe('P');
    const ids = fieldedIds(game, 0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('vacates the old position when a fielder moves to an empty slot', () => {
    const gameId = seed(12);
    const a = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(gameId, 0, 'P', a);
    useAppStore.getState().assignPlayer(gameId, 0, 'RF', a);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(game, 0, a)).toBe('RF');
    expect(fieldedIds(game, 0)).toEqual([a]);
  });

  it('sends the displaced player to the bench when a sub comes on', () => {
    const gameId = seed(12);
    const [a, , , , , , , , , , , sub] = useAppStore
      .getState()
      .players.map((p) => p.id);
    useAppStore.getState().assignPlayer(gameId, 0, 'P', a);
    useAppStore.getState().assignPlayer(gameId, 0, 'P', sub);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(game, 0, sub)).toBe('P');
    expect(positionOf(game, 0, a)).toBeNull();
  });
});

describe('games', () => {
  beforeEach(reset);

  it('duplicates a game with its assignments but a new id', () => {
    const gameId = seed(12);
    const p = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(gameId, 0, 'SS', p);

    const copyId = useAppStore.getState().duplicateGame(gameId)!;
    expect(copyId).not.toBe(gameId);

    const copy = useAppStore.getState().games.find((g) => g.id === copyId)!;
    expect(positionOf(copy, 0, p)).toBe('SS');

    // Editing the copy must not touch the original.
    useAppStore.getState().clearInning(copyId, 0);
    const original = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(original, 0, p)).toBe('SS');
  });

  it('drops assignments for innings removed by shortening the game', () => {
    const gameId = seed(12);
    const p = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(gameId, 5, 'SS', p);
    useAppStore.getState().setInnings(gameId, 4);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.innings).toBe(4);
    expect(game.assignments[5]).toBeUndefined();
  });

  it('copies the previous inning', () => {
    const gameId = seed(12);
    const p = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(gameId, 0, '1B', p);
    useAppStore.getState().copyPreviousInning(gameId, 1);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(game, 1, p)).toBe('1B');
  });

  it('adds a late-joining player to the bottom of an unstarted batting order', () => {
    const gameId = seed(10);
    useAppStore.getState().addPlayer('Late Arrival', '99');
    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    const late = useAppStore.getState().players.at(-1)!;
    expect(game.battingOrder.at(-1)).toBe(late.id);
  });
});

describe('attendance', () => {
  beforeEach(reset);

  it('starts a new game with the whole roster present', () => {
    const gameId = seed(14);
    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toHaveLength(14);
  });

  it('removes an absent player from the batting order', () => {
    const gameId = seed(14);
    const absent = useAppStore.getState().players[3].id;
    useAppStore.getState().togglePlayerAttendance(gameId, absent);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toHaveLength(13);
    expect(game.battingOrder).not.toContain(absent);
  });

  it('pulls an absent player out of innings they were already assigned to', () => {
    const gameId = seed(14);
    const absent = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(gameId, 0, 'SS', absent);
    useAppStore.getState().assignPlayer(gameId, 1, 'P', absent);
    useAppStore.getState().togglePlayerAttendance(gameId, absent);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(positionOf(game, 0, absent)).toBeNull();
    expect(positionOf(game, 1, absent)).toBeNull();
  });

  it('restores a player in roster order, not at the bottom', () => {
    const gameId = seed(14);
    const ids = useAppStore.getState().players.map((p) => p.id);
    useAppStore.getState().togglePlayerAttendance(gameId, ids[2]);
    useAppStore.getState().togglePlayerAttendance(gameId, ids[2]);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual(ids);
  });

  it('keeps attendance intact when the roster is reordered', () => {
    const gameId = seed(14);
    const ids = useAppStore.getState().players.map((p) => p.id);
    const absent = ids[5];
    useAppStore.getState().togglePlayerAttendance(gameId, absent);
    // Reordering the roster must not drag the absent player back in.
    useAppStore.getState().movePlayer(0, 9);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).not.toContain(absent);
    expect(game.battingOrder).toHaveLength(13);
  });

  it('adds a new roster player only to games with no lineup yet', () => {
    const untouched = seed(12);
    const started = useAppStore.getState().createGame('Started', '2026-09-20');
    const someone = useAppStore.getState().players[0].id;
    useAppStore.getState().assignPlayer(started, 0, 'C', someone);

    useAppStore.getState().addPlayer('Late Arrival', '99');
    const late = useAppStore.getState().players.at(-1)!.id;

    const games = useAppStore.getState().games;
    expect(games.find((g) => g.id === untouched)!.battingOrder).toContain(late);
    expect(games.find((g) => g.id === started)!.battingOrder).not.toContain(late);
  });

  it('autofills only among the players who are present', () => {
    const gameId = seed(14);
    const absent = useAppStore.getState().players.slice(0, 3).map((p) => p.id);
    for (const id of absent) {
      useAppStore.getState().togglePlayerAttendance(gameId, id);
    }
    useAppStore.getState().autoFill(gameId);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    for (let i = 0; i < game.innings; i++) {
      const ids = fieldedIds(game, i);
      expect(ids).toHaveLength(9);
      for (const a of absent) expect(ids).not.toContain(a);
    }
  });

  it('leaves positions empty when fewer than nine are present', () => {
    const gameId = seed(12);
    // Drop to 6 present.
    for (const p of useAppStore.getState().players.slice(0, 6)) {
      useAppStore.getState().togglePlayerAttendance(gameId, p.id);
    }
    useAppStore.getState().autoFill(gameId);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toHaveLength(6);
    expect(fieldedIds(game, 0)).toHaveLength(6);
  });

  it('clearing attendance empties the lineup', () => {
    const gameId = seed(12);
    useAppStore.getState().autoFill(gameId);
    useAppStore.getState().setAllAttending(gameId, false);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual([]);
    expect(fieldedIds(game, 0)).toEqual([]);
  });
});

describe('batting order', () => {
  beforeEach(reset);

  it('starts in roster order and is not marked custom', () => {
    const gameId = seed(12);
    const ids = useAppStore.getState().players.map((p) => p.id);
    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual(ids);
    expect(game.customOrder).toBeFalsy();
  });

  it('moves a batter and marks the game custom', () => {
    const gameId = seed(12);
    const ids = useAppStore.getState().players.map((p) => p.id);
    // Move the 6th batter up to leadoff.
    useAppStore.getState().moveBatter(gameId, 5, 0);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.customOrder).toBe(true);
    expect(game.battingOrder[0]).toBe(ids[5]);
    expect(game.battingOrder).toHaveLength(12);
    expect(new Set(game.battingOrder).size).toBe(12);
  });

  it('keeps a custom order when the roster is reordered', () => {
    const gameId = seed(12);
    useAppStore.getState().moveBatter(gameId, 5, 0);
    const before = [
      ...useAppStore.getState().games.find((g) => g.id === gameId)!.battingOrder,
    ];

    useAppStore.getState().movePlayer(0, 11);

    const after = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(after.battingOrder).toEqual(before);
  });

  it('still follows the roster for a game left in roster order', () => {
    const gameId = seed(12);
    useAppStore.getState().movePlayer(0, 11);

    const ids = useAppStore.getState().players.map((p) => p.id);
    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual(ids);
  });

  it('keeps a custom order when a player is marked absent', () => {
    const gameId = seed(12);
    useAppStore.getState().moveBatter(gameId, 5, 0);
    const order = [
      ...useAppStore.getState().games.find((g) => g.id === gameId)!.battingOrder,
    ];
    const absent = order[3];
    useAppStore.getState().togglePlayerAttendance(gameId, absent);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual(order.filter((id) => id !== absent));
  });

  it('puts a late arrival at the bottom of a custom order', () => {
    const gameId = seed(12);
    useAppStore.getState().moveBatter(gameId, 5, 0);
    const order = [
      ...useAppStore.getState().games.find((g) => g.id === gameId)!.battingOrder,
    ];
    const late = order[2];
    useAppStore.getState().togglePlayerAttendance(gameId, late); // out
    useAppStore.getState().togglePlayerAttendance(gameId, late); // back in

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder.at(-1)).toBe(late);
    expect(game.battingOrder).toHaveLength(12);
  });

  it('resets back to roster order on request', () => {
    const gameId = seed(12);
    useAppStore.getState().moveBatter(gameId, 8, 0);
    useAppStore.getState().resetBattingOrder(gameId);

    const ids = useAppStore.getState().players.map((p) => p.id);
    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual(ids);
    expect(game.customOrder).toBe(false);
  });

  it('gives each game its own order', () => {
    const a = seed(12);
    const b = useAppStore.getState().createGame('Second', '2026-09-24');
    useAppStore.getState().moveBatter(a, 7, 0);

    const games = useAppStore.getState().games;
    const ids = useAppStore.getState().players.map((p) => p.id);
    expect(games.find((g) => g.id === a)!.battingOrder[0]).toBe(ids[7]);
    expect(games.find((g) => g.id === b)!.battingOrder).toEqual(ids);
  });

  it('ignores an out-of-range move', () => {
    const gameId = seed(12);
    const before = [
      ...useAppStore.getState().games.find((g) => g.id === gameId)!.battingOrder,
    ];
    useAppStore.getState().moveBatter(gameId, 0, 99);
    useAppStore.getState().moveBatter(gameId, -1, 0);

    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    expect(game.battingOrder).toEqual(before);
  });

  it('carries the custom order into a duplicated game', () => {
    const gameId = seed(12);
    useAppStore.getState().moveBatter(gameId, 6, 0);
    const copyId = useAppStore.getState().duplicateGame(gameId)!;

    const src = useAppStore.getState().games.find((g) => g.id === gameId)!;
    const copy = useAppStore.getState().games.find((g) => g.id === copyId)!;
    expect(copy.battingOrder).toEqual(src.battingOrder);
    expect(copy.customOrder).toBe(true);
  });
});
