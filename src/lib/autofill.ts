import {
  FIELD_SLOTS,
  INFIELD,
  POSITIONS,
  type Assignments,
  type Game,
  type Player,
  type Position,
} from '../types';
import { seededRandom } from './ids';
import { fieldedIds } from './fairness';

/**
 * Scarcest-first. Catcher and pitcher matter most and have the fewest willing
 * kids, so they get picked before the outfield spots soak up the roster.
 */
const ASSIGN_ORDER: Position[] = ['C', 'P', 'SS', '1B', '3B', '2B', 'CF', 'LF', 'RF'];

const ZONE: Record<Position, 'IF' | 'OF'> = POSITIONS.reduce(
  (acc, p) => {
    acc[p] = INFIELD.includes(p) ? 'IF' : 'OF';
    return acc;
  },
  {} as Record<Position, 'IF' | 'OF'>,
);

export interface AutofillOptions {
  /** Keep innings that are already fully filled and only complete the rest. */
  fillRemainingOnly?: boolean;
}

/**
 * Builds a full-game defensive lineup.
 *
 * Greedy and deterministic: bench time is spread as evenly as the roster size
 * allows, nobody sits twice in a row while anyone else could sit instead, and
 * players rotate through positions and zones rather than repeating one spot.
 *
 * This proposes — the coach adjusts afterwards.
 */
export function suggestLineup(
  game: Game,
  players: Player[],
  options: AutofillOptions = {},
): Assignments {
  const rand = seededRandom(game.id + ':' + players.length + ':' + game.innings);
  const roster = game.battingOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p);

  if (roster.length === 0) return {};

  const result: Assignments = {};
  const benchTotal: Record<string, number> = {};
  const posPlayed: Record<string, Record<Position, number>> = {};
  const zonePlayed: Record<string, { IF: number; OF: number }> = {};
  for (const p of roster) {
    benchTotal[p.id] = 0;
    posPlayed[p.id] = POSITIONS.reduce(
      (a, pos) => ((a[pos] = 0), a),
      {} as Record<Position, number>,
    );
    zonePlayed[p.id] = { IF: 0, OF: 0 };
  }

  let benchedLastInning = new Set<string>();

  for (let inning = 0; inning < game.innings; inning++) {
    const existing = game.assignments[inning] ?? {};
    const alreadyComplete = fieldedIds(game, inning).length >= FIELD_SLOTS;

    if (options.fillRemainingOnly && alreadyComplete) {
      // Preserve the coach's own work, but still count it toward fairness so
      // later innings compensate for it.
      result[inning] = { ...existing };
      const fielded = new Set(fieldedIds(game, inning));
      const benchedNow = new Set<string>();
      for (const p of roster) {
        if (fielded.has(p.id)) {
          const pos = POSITIONS.find((x) => existing[x] === p.id);
          if (pos) {
            posPlayed[p.id][pos] += 1;
            zonePlayed[p.id][ZONE[pos]] += 1;
          }
        } else {
          benchTotal[p.id] += 1;
          benchedNow.add(p.id);
        }
      }
      benchedLastInning = benchedNow;
      continue;
    }

    const needBenched = Math.max(0, roster.length - FIELD_SLOTS);

    // --- Choose who sits -------------------------------------------------
    // Fewest bench innings so far sits first; sitting twice running is a hard
    // penalty, not a tiebreak, so it only happens when the roster forces it.
    const benchOrder = [...roster].sort((a, b) => {
      const penalty = (id: string) => (benchedLastInning.has(id) ? 1 : 0);
      const ap = penalty(a.id);
      const bp = penalty(b.id);
      if (ap !== bp) return ap - bp;
      if (benchTotal[a.id] !== benchTotal[b.id]) {
        return benchTotal[a.id] - benchTotal[b.id];
      }
      return rand() - 0.5;
    });

    const benchedNow = new Set(benchOrder.slice(0, needBenched).map((p) => p.id));
    const available = roster.filter((p) => !benchedNow.has(p.id));

    // --- Assign the 9 fielders -------------------------------------------
    const inn: Partial<Record<Position, string>> = {};
    const taken = new Set<string>();

    for (const pos of ASSIGN_ORDER) {
      const candidates = available.filter((p) => !taken.has(p.id));
      if (candidates.length === 0) break;

      const zone = ZONE[pos];
      candidates.sort((a, b) => {
        // Least experience at this exact position wins.
        const ap = posPlayed[a.id][pos];
        const bp = posPlayed[b.id][pos];
        if (ap !== bp) return ap - bp;
        // Then whoever has seen this half of the field less.
        const az = zonePlayed[a.id][zone];
        const bz = zonePlayed[b.id][zone];
        if (az !== bz) return az - bz;
        return rand() - 0.5;
      });

      const pick = candidates[0];
      inn[pos] = pick.id;
      taken.add(pick.id);
    }

    // --- Book-keeping for the next inning --------------------------------
    for (const pos of POSITIONS) {
      const id = inn[pos];
      if (!id) continue;
      posPlayed[id][pos] += 1;
      zonePlayed[id][ZONE[pos]] += 1;
    }
    for (const id of benchedNow) benchTotal[id] += 1;

    result[inning] = inn;
    benchedLastInning = benchedNow;
  }

  return result;
}
