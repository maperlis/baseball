import {
  FIELD_SLOTS,
  INFIELD,
  POSITIONS,
  type Assignments,
  type Game,
  type Player,
  type Position,
} from '../types';

/** Player ids in the field for an inning, in position order. */
export function fieldedIds(game: Game, inning: number): string[] {
  const inn = game.assignments[inning] ?? {};
  return POSITIONS.map((p) => inn[p]).filter((id): id is string => !!id);
}

/** Players not in the field for an inning — the bench. Always derived. */
export function benchPlayers(game: Game, players: Player[], inning: number): Player[] {
  const fielded = new Set(fieldedIds(game, inning));
  return players.filter((p) => !fielded.has(p.id));
}

/** The position a player occupies in an inning, or null if benched. */
export function positionOf(
  game: Game,
  inning: number,
  playerId: string,
): Position | null {
  const inn = game.assignments[inning] ?? {};
  for (const p of POSITIONS) {
    if (inn[p] === playerId) return p;
  }
  return null;
}

/** Innings each player sits out, across the whole game. */
export function benchCounts(game: Game, players: Player[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of players) counts[p.id] = 0;
  for (let i = 0; i < game.innings; i++) {
    const fielded = new Set(fieldedIds(game, i));
    for (const p of players) {
      if (!fielded.has(p.id)) counts[p.id] += 1;
    }
  }
  return counts;
}

/** How often each player has played each position. Feeds rotation variety. */
export function positionCounts(
  game: Game,
  players: Player[],
): Record<string, Record<Position, number>> {
  const out: Record<string, Record<Position, number>> = {};
  for (const p of players) {
    out[p.id] = POSITIONS.reduce(
      (acc, pos) => ((acc[pos] = 0), acc),
      {} as Record<Position, number>,
    );
  }
  for (let i = 0; i < game.innings; i++) {
    const inn = game.assignments[i] ?? {};
    for (const pos of POSITIONS) {
      const id = inn[pos];
      if (id && out[id]) out[id][pos] += 1;
    }
  }
  return out;
}

/** Innings that don't have all 9 positions filled. Blocks a clean export. */
export function incompleteInnings(game: Game): number[] {
  const out: number[] = [];
  for (let i = 0; i < game.innings; i++) {
    if (fieldedIds(game, i).length < FIELD_SLOTS) out.push(i);
  }
  return out;
}

/** A player appearing twice in one inning — should be impossible, but assert it. */
export function duplicateAssignments(game: Game): number[] {
  const out: number[] = [];
  for (let i = 0; i < game.innings; i++) {
    const ids = fieldedIds(game, i);
    if (new Set(ids).size !== ids.length) out.push(i);
  }
  return out;
}

export type Severity = 'warn' | 'info';

export interface FairnessWarning {
  playerId: string;
  severity: Severity;
  message: string;
}

/**
 * The checks a coach actually gets asked about by parents: who sat, how often,
 * and whether anyone got stuck in right field all game.
 */
export function fairnessWarnings(game: Game, players: Player[]): FairnessWarning[] {
  if (players.length === 0) return [];
  const warnings: FairnessWarning[] = [];
  const counts = benchCounts(game, players);

  // Only meaningful once innings are actually filled in.
  const anyFilled = Array.from({ length: game.innings }).some(
    (_, i) => fieldedIds(game, i).length > 0,
  );
  if (!anyFilled) return [];

  const benchable = players.length > FIELD_SLOTS;
  const min = Math.min(...players.map((p) => counts[p.id]));

  for (const player of players) {
    // Sat two innings running.
    for (let i = 1; i < game.innings; i++) {
      const prev = fieldedIds(game, i - 1);
      const cur = fieldedIds(game, i);
      if (prev.length === 0 || cur.length === 0) continue;
      if (!prev.includes(player.id) && !cur.includes(player.id)) {
        warnings.push({
          playerId: player.id,
          severity: 'warn',
          message: `Sits out innings ${i} and ${i + 1} back to back`,
        });
        break;
      }
    }

    // Sitting more than the least-benched player by more than one inning.
    if (benchable && counts[player.id] > min + 1) {
      warnings.push({
        playerId: player.id,
        severity: 'warn',
        message: `Sits ${counts[player.id]} innings — ${counts[player.id] - min} more than the least-benched player`,
      });
    }
  }

  // Nobody should spend a whole game in the outfield.
  const posCounts = positionCounts(game, players);
  const fullyAssigned = incompleteInnings(game).length === 0;
  if (fullyAssigned) {
    for (const player of players) {
      const played = POSITIONS.filter((p) => posCounts[player.id][p] > 0);
      if (played.length === 0) continue;
      const infieldInnings = INFIELD.reduce(
        (n, p) => n + posCounts[player.id][p],
        0,
      );
      if (infieldInnings === 0) {
        warnings.push({
          playerId: player.id,
          severity: 'info',
          message: 'Never plays an infield position this game',
        });
      }
    }
  }

  return warnings;
}

/** True when every inning has all 9 slots filled and no player is doubled up. */
export function isGameComplete(game: Game): boolean {
  return incompleteInnings(game).length === 0 && duplicateAssignments(game).length === 0;
}

/** Drops assignments for innings beyond the current count, and unknown players. */
export function pruneAssignments(
  assignments: Assignments,
  innings: number,
  validIds: Set<string>,
): Assignments {
  const next: Assignments = {};
  for (let i = 0; i < innings; i++) {
    const inn = assignments[i];
    if (!inn) continue;
    const kept: Partial<Record<Position, string>> = {};
    for (const pos of POSITIONS) {
      const id = inn[pos];
      if (id && validIds.has(id)) kept[pos] = id;
    }
    if (Object.keys(kept).length > 0) next[i] = kept;
  }
  return next;
}
