import { describe, expect, it } from 'vitest';
import { suggestLineup } from '../autofill';
import { benchCounts, fieldedIds } from '../fairness';
import { FIELD_SLOTS, POSITIONS } from '../../types';
import { makeGame, makePlayers } from './helpers';

describe('suggestLineup', () => {
  it('fills every position in every inning for a 20-player roster', () => {
    const players = makePlayers(20);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    for (let i = 0; i < 6; i++) {
      const ids = fieldedIds(filled, i);
      expect(ids).toHaveLength(FIELD_SLOTS);
      for (const pos of POSITIONS) {
        expect(filled.assignments[i][pos]).toBeTruthy();
      }
    }
  });

  it('never plays the same player twice in one inning', () => {
    const players = makePlayers(20);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    for (let i = 0; i < 6; i++) {
      const ids = fieldedIds(filled, i);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('spreads bench innings within one inning of each other', () => {
    const players = makePlayers(20);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    const counts = Object.values(benchCounts(filled, players));
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('does not bench anyone in consecutive innings when the roster allows', () => {
    // 12 players: 3 sit each inning out of 12, so there is always someone else
    // available to take the bench next inning.
    const players = makePlayers(12);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    for (let i = 1; i < 6; i++) {
      const prev = new Set(fieldedIds(filled, i - 1));
      const cur = new Set(fieldedIds(filled, i));
      const satTwice = players.filter((p) => !prev.has(p.id) && !cur.has(p.id));
      expect(satTwice).toEqual([]);
    }
  });

  it('benches nobody when the roster is exactly nine', () => {
    const players = makePlayers(9);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    const counts = benchCounts(filled, players);
    expect(Object.values(counts).every((c) => c === 0)).toBe(true);
  });

  it('rotates players rather than parking one in a single position', () => {
    const players = makePlayers(20);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    for (const p of players) {
      const spots = new Set<string>();
      for (let i = 0; i < 6; i++) {
        const pos = POSITIONS.find((x) => filled.assignments[i][x] === p.id);
        if (pos) spots.add(pos);
      }
      // Anyone who played at least twice should see more than one position.
      const appearances = Array.from({ length: 6 }).filter((_, i) =>
        fieldedIds(filled, i).includes(p.id),
      ).length;
      if (appearances >= 3) expect(spots.size).toBeGreaterThan(1);
    }
  });

  it('is deterministic for the same game', () => {
    const players = makePlayers(15);
    const game = makeGame(players, 6);
    expect(suggestLineup(game, players)).toEqual(suggestLineup(game, players));
  });

  it('preserves complete innings when filling remaining only', () => {
    const players = makePlayers(14);
    const game = makeGame(players, 6);
    // Hand-place inning 1 in full.
    const manual: Record<string, string> = {};
    POSITIONS.forEach((pos, idx) => {
      manual[pos] = players[idx].id;
    });
    game.assignments[0] = { ...manual } as never;

    const result = suggestLineup(game, players, { fillRemainingOnly: true });
    expect(result[0]).toEqual(game.assignments[0]);
    for (let i = 1; i < 6; i++) {
      expect(Object.keys(result[i])).toHaveLength(FIELD_SLOTS);
    }
  });

  it('handles a roster smaller than nine without crashing', () => {
    const players = makePlayers(6);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };
    for (let i = 0; i < 6; i++) {
      expect(fieldedIds(filled, i)).toHaveLength(6);
    }
  });

  it('returns nothing for an empty roster', () => {
    const game = makeGame([], 6);
    expect(suggestLineup(game, [])).toEqual({});
  });
});
