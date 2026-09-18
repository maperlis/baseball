import { describe, expect, it } from 'vitest';
import {
  benchCounts,
  benchPlayers,
  duplicateAssignments,
  fairnessWarnings,
  incompleteInnings,
  isGameComplete,
  positionOf,
  pruneAssignments,
} from '../fairness';
import { suggestLineup } from '../autofill';
import { POSITIONS } from '../../types';
import { makeGame, makePlayers } from './helpers';

/** Fills one inning with the first nine players, in position order. */
function fillInning(startIdx: number) {
  const inn: Record<string, string> = {};
  POSITIONS.forEach((pos, i) => {
    inn[pos] = `p${startIdx + i}`;
  });
  return inn as never;
}

describe('bench accounting', () => {
  it('counts an unassigned player as benched', () => {
    const players = makePlayers(11);
    const game = makeGame(players, 2);
    game.assignments[0] = fillInning(1); // p1..p9 play, p10/p11 sit
    game.assignments[1] = fillInning(1);

    const counts = benchCounts(game, players);
    expect(counts['p1']).toBe(0);
    expect(counts['p10']).toBe(2);
    expect(counts['p11']).toBe(2);
  });

  it('derives the bench rather than storing it', () => {
    const players = makePlayers(11);
    const game = makeGame(players, 1);
    game.assignments[0] = fillInning(1);

    expect(benchPlayers(game, players, 0).map((p) => p.id)).toEqual(['p10', 'p11']);
  });

  it('reports the position a player holds, or null when benched', () => {
    const players = makePlayers(11);
    const game = makeGame(players, 1);
    game.assignments[0] = fillInning(1);

    expect(positionOf(game, 0, 'p1')).toBe('P');
    expect(positionOf(game, 0, 'p10')).toBeNull();
  });
});

describe('fairnessWarnings', () => {
  it('stays quiet on an empty lineup', () => {
    const players = makePlayers(12);
    const game = makeGame(players, 6);
    expect(fairnessWarnings(game, players)).toEqual([]);
  });

  it('does not flag back-to-back sits on a roster where they are unavoidable', () => {
    // 20 players, 18 field slots across any two innings — at least 2 kids must
    // sit both. Warning about that would cry wolf on every real lineup.
    const players = makePlayers(20);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    const backToBack = fairnessWarnings(filled, players).filter((w) =>
      w.message.includes('back to back'),
    );
    expect(backToBack).toEqual([]);
  });

  it('still flags back-to-back sits when the roster leaves room to avoid them', () => {
    const players = makePlayers(11);
    const game = makeGame(players, 2);
    game.assignments[0] = fillInning(1);
    game.assignments[1] = fillInning(1);

    const backToBack = fairnessWarnings(game, players).filter((w) =>
      w.message.includes('back to back'),
    );
    expect(backToBack.length).toBeGreaterThan(0);
  });

  it('flags a player who sits two innings running', () => {
    const players = makePlayers(11);
    const game = makeGame(players, 2);
    game.assignments[0] = fillInning(1);
    game.assignments[1] = fillInning(1); // p10, p11 sit both innings

    const warnings = fairnessWarnings(game, players);
    const backToBack = warnings.filter((w) => w.message.includes('back to back'));
    expect(backToBack.map((w) => w.playerId).sort()).toEqual(['p10', 'p11']);
  });

  it('flags an uneven bench spread', () => {
    const players = makePlayers(11);
    const game = makeGame(players, 4);
    for (let i = 0; i < 4; i++) game.assignments[i] = fillInning(1);

    const warnings = fairnessWarnings(game, players);
    const uneven = warnings.filter((w) => w.message.includes('more than the least'));
    expect(uneven.length).toBeGreaterThan(0);
    expect(uneven.every((w) => w.playerId === 'p10' || w.playerId === 'p11')).toBe(true);
  });

  it('produces no warnings for an autofilled game', () => {
    const players = makePlayers(15);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };

    const blocking = fairnessWarnings(filled, players).filter(
      (w) => w.severity === 'warn',
    );
    expect(blocking).toEqual([]);
  });

  it('notes a player stuck in the outfield all game', () => {
    const players = makePlayers(9);
    const game = makeGame(players, 3);
    // p9 parks in RF every inning; everyone else rotates the infield.
    for (let i = 0; i < 3; i++) {
      game.assignments[i] = fillInning(1);
    }
    const info = fairnessWarnings(game, players).filter((w) => w.severity === 'info');
    expect(info.some((w) => w.playerId === 'p9')).toBe(true);
  });
});

describe('completeness', () => {
  it('reports innings that are short of nine', () => {
    const players = makePlayers(12);
    const game = makeGame(players, 3);
    game.assignments[0] = fillInning(1);
    game.assignments[1] = { P: 'p1' } as never;

    expect(incompleteInnings(game)).toEqual([1, 2]);
    expect(isGameComplete(game)).toBe(false);
  });

  it('accepts a fully autofilled game', () => {
    const players = makePlayers(20);
    const game = makeGame(players, 6);
    const filled = { ...game, assignments: suggestLineup(game, players) };
    expect(isGameComplete(filled)).toBe(true);
    expect(duplicateAssignments(filled)).toEqual([]);
  });
});

describe('pruneAssignments', () => {
  it('drops innings beyond the new count and unknown players', () => {
    const players = makePlayers(12);
    const game = makeGame(players, 3);
    game.assignments[0] = fillInning(1);
    game.assignments[2] = fillInning(1);

    const pruned = pruneAssignments(game.assignments, 1, new Set(['p1', 'p2']));
    expect(Object.keys(pruned)).toEqual(['0']);
    expect(Object.values(pruned[0]).sort()).toEqual(['p1', 'p2']);
  });
});
