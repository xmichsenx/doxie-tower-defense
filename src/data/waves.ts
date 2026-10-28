import type { EnemyId } from '../core/types';

export interface SpawnGroup {
  enemy: EnemyId;
  count: number;
  /** Seconds between spawns in this group. */
  interval: number;
  /** Seconds after wave start before the first spawn. */
  delay: number;
}

export interface WaveDef {
  groups: SpawnGroup[];
  hpMult: number;
  speedMult: number;
}

const g = (enemy: EnemyId, count: number, interval: number, delay = 0): SpawnGroup => ({ enemy, count, interval, delay });
const w = (...groups: SpawnGroup[]): WaveDef => ({ groups, hpMult: 1, speedMult: 1 });

export const WAVES: WaveDef[] = [
  /* 1 */ w(g('reczny', 20, 0.9)),
  /* 2 */ w(g('reczny', 30, 0.6)),
  /* 3 */ w(g('reczny', 15, 0.6), g('workowy', 8, 1.2, 4)),
  /* 4 */ w(g('reczny', 25, 0.4), g('workowy', 15, 0.9, 2)),
  /* 5 */ w(g('workowy', 25, 0.55)),
  /* 6 */ w(g('reczny', 20, 0.3), g('workowy', 15, 0.6, 3), g('robot', 6, 1, 8)),
  /* 7 */ w(g('workowy', 25, 0.45), g('robot', 12, 0.7, 4)),
  /* 8 */ w(g('workowy', 20, 0.5), g('pionowy', 4, 2, 6)),
  /* 9 */ w(g('robot', 30, 0.45)),
  /* 10 */ w(g('pionowy', 10, 1.4), g('workowy', 20, 0.5, 4)),
  /* 11 */ w(g('reczny', 40, 0.2), g('pionowy', 10, 1, 3), g('robot', 15, 0.6, 6)),
  /* 12 */ w(g('pionowy', 20, 0.8)),
  /* 13 */ w(g('robot', 40, 0.3), g('pionowy', 15, 0.7, 4)),
  /* 14 */ w(g('cien', 6, 1.5), g('pionowy', 18, 0.6, 2)),
  /* 15 */ w(g('pionowy', 22, 0.55), g('cien', 8, 1, 6)),
  /* 16 */ w(g('robot', 60, 0.18), g('workowy', 40, 0.2, 3)),
  /* 17 */ w(g('cien', 20, 0.6), g('pionowy', 18, 0.5, 3)),
  /* 18 */ w(g('pionowy', 34, 0.4)),
  /* 19 */ w(g('cien', 35, 0.4), g('robot', 40, 0.2, 2)),
  /* 20 */ w(g('przemyslowy', 4, 3), g('pionowy', 22, 0.5, 2)),
  /* 21 */ w(g('przemyslowy', 8, 2), g('cien', 20, 0.4, 4)),
  /* 22 */ w(g('pionowy', 50, 0.25)),
  /* 23 */ w(g('przemyslowy', 12, 1.5), g('robot', 60, 0.15, 3)),
  /* 24 */ w(g('parowy', 6, 2), g('pionowy', 40, 0.3, 2)),
  /* 25 */ w(g('parowy', 12, 1.2), g('przemyslowy', 8, 1.5, 4)),
  /* 26 */ w(g('cien', 60, 0.2), g('parowy', 10, 1, 5)),
  /* 27 */ w(g('przemyslowy', 16, 1), g('pionowy', 40, 0.2, 3)),
  /* 28 */ w(g('parowy', 25, 0.7), g('cien', 40, 0.25, 4)),
  /* 29 */ w(g('przemyslowy', 25, 0.8), g('parowy', 15, 0.8, 6)),
  /* 30 */ w(g('przemyslowy', 40, 0.5)),
  /* 31 */ w(g('parowy', 40, 0.4), g('cien', 60, 0.15, 3)),
  /* 32 */ w(g('przemyslowy', 40, 0.45), g('parowy', 30, 0.5, 5)),
  /* 33 */ w(g('pionowy', 150, 0.08)),
  /* 34 */ w(g('przemyslowy', 50, 0.35), g('cien', 80, 0.12, 4)),
  /* 35 */ w(g('megassak', 1, 1), g('przemyslowy', 30, 0.5, 6)),
  /* 36 */ w(g('parowy', 70, 0.25), g('przemyslowy', 40, 0.4, 4)),
  /* 37 */ w(g('przemyslowy', 80, 0.25)),
  /* 38 */ w(g('megassak', 2, 8), g('parowy', 50, 0.3, 4)),
  /* 39 */ w(g('przemyslowy', 100, 0.2), g('cien', 100, 0.1, 3)),
  /* 40 */ w(g('megassak', 3, 6), g('przemyslowy', 60, 0.3, 10)),
];

/** Endless mode reuses waves 31–40 with growing HP and speed. */
export function endlessWave(n: number): WaveDef {
  const over = n - WAVES.length;
  const template = WAVES[30 + ((over - 1) % 10)]!;
  return {
    groups: template.groups.map((gr) => ({ ...gr })),
    hpMult: 1 + over * 0.12,
    speedMult: 1 + Math.min(0.6, over * 0.02),
  };
}

/** Wave number n is 1-based. */
export function getWave(n: number): WaveDef {
  if (n < 1) throw new Error(`Invalid wave ${n}`);
  return n <= WAVES.length ? WAVES[n - 1]! : endlessWave(n);
}
