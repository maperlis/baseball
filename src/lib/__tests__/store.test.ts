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

  it('adds a late-joining player to the bottom of existing batting orders', () => {
    const gameId = seed(10);
    useAppStore.getState().addPlayer('Late Arrival', '99');
    const game = useAppStore.getState().games.find((g) => g.id === gameId)!;
    const late = useAppStore.getState().players.at(-1)!;
    expect(game.battingOrder.at(-1)).toBe(late.id);
  });
});
