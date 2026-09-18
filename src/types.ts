export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

/** Fixed display order, used by the grid, the PDF, and autofill. */
export const POSITIONS: Position[] = [
  'P',
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];

export const INFIELD: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];
export const OUTFIELD: Position[] = ['LF', 'CF', 'RF'];

/** Label for a player who is not in the field for an inning. Derived, never stored. */
export const OUT = 'OUT';

export const MAX_PLAYERS = 20;
export const FIELD_SLOTS = POSITIONS.length; // 9
export const DEFAULT_INNINGS = 6;

export interface Player {
  id: string;
  name: string;
  /** Optional — the sample lineup card has blanks. */
  uniform: string;
}

/** inning index (0-based) -> position -> playerId */
export type Assignments = Record<number, Partial<Record<Position, string>>>;

export interface Game {
  id: string;
  name: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  innings: number;
  /** Player ids in batting order. Continuous — every rostered player bats. */
  battingOrder: string[];
  assignments: Assignments;
}

export interface Team {
  name: string;
  players: Player[];
}

export const POSITION_LABELS: Record<Position, string> = {
  P: 'Pitcher',
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  '3B': 'Third Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  CF: 'Center Field',
  RF: 'Right Field',
};
