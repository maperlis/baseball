export { seededRandom } from '../../lib/ids';

export type Rng = () => number;

/** Standard normal via Box–Muller. */
export function gauss(rnd: Rng): number {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
