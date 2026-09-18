import type { Game, Player } from '../../types';

export function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    uniform: String(i + 1),
  }));
}

export function makeGame(players: Player[], innings = 6): Game {
  return {
    id: 'g1',
    name: 'Test game',
    date: '2026-09-17',
    innings,
    battingOrder: players.map((p) => p.id),
    assignments: {},
  };
}
