/**
 * Renders a lineup PDF outside the browser so the output can be diffed against
 * the reference card.
 *
 *   npx vite-node scripts/pdf-sample.ts -- out.pdf [players] [innings]
 */
import { writeFileSync } from 'node:fs';
import { buildLineupPdf } from '../src/lib/pdf';
import type { Assignments, Game, Player, Position } from '../src/types';

const args = process.argv.slice(2);
const out = args[0] ?? 'lineup.pdf';
const playerCount = Number(args[1] ?? 10);
const innings = Number(args[2] ?? 6);

/** The reference card's roster and assignments, so a visual diff is like-for-like. */
const SAMPLE: [string, string, string[]][] = [
  ['Maxx B', '1', ['RF', 'LF', 'CF', 'CF', 'CF', 'CF']],
  ['Anthony D', '7', ['2B', 'OUT', 'P', 'P', '2B', '2B']],
  ['Will G', '8', ['C', 'C', '3B', 'RF', '1B', '1B']],
  ['Fletcher S', '11', ['P', 'P', '1B', '1B', 'SS', 'SS']],
  ['Patrick M', '', ['SS', 'SS', 'C', 'C', 'OUT', 'OUT']],
  ['Liam M', '', ['1B', '2B', 'RF', 'LF', 'RF', 'RF']],
  ['Leo B', '', ['LF', '1B', '2B', 'OUT', 'P', 'P']],
  ['Jack R', '2', ['CF', 'CF', 'SS', '3B', 'C', 'C']],
  ['Andrew C', '13', ['3B', '3B', 'OUT', 'SS', '3B', '3B']],
  ['Ian Y', '13', ['OUT', 'RF', 'LF', '2B', 'LF', 'LF']],
];

const players: Player[] = [];
const assignments: Assignments = {};

for (let i = 0; i < playerCount; i++) {
  const [baseName, uniform, slots] = SAMPLE[i % SAMPLE.length];
  const id = `p${i + 1}`;
  const wrap = Math.floor(i / SAMPLE.length);
  players.push({ id, name: wrap === 0 ? baseName : `${baseName} ${wrap + 1}`, uniform });

  for (let inn = 0; inn < innings; inn++) {
    const pos = slots[inn % slots.length];
    if (pos === 'OUT') continue;
    assignments[inn] ??= {};
    // First claim wins; extra players beyond 10 simply land on the bench, which
    // is exactly what a 20-player roster looks like.
    if (!assignments[inn][pos as Position]) assignments[inn][pos as Position] = id;
  }
}

const game: Game = {
  id: 'sample',
  name: '2026 WW Fall Ball Minors',
  date: '2026-09-17',
  innings,
  battingOrder: players.map((p) => p.id),
  assignments,
};

const doc = buildLineupPdf('2026 WW Fall Ball Minors', game, players);
writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log(`wrote ${out} — ${playerCount} players, ${innings} innings`);
