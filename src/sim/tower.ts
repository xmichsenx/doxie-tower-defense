import { dist } from '../core/math';
import type { Path } from '../core/path';
import type { TargetMode, Vec2 } from '../core/types';
import { MAX_LEVEL, computeStats, type TowerDef, type TowerStats } from '../data/towers';
import type { Enemy } from './enemy';
import { sellValue } from './economy';

export interface TrapSpot {
  pathIndex: number;
  d: number;
}

export interface Tower {
  uid: number;
  def: TowerDef;
  pos: Vec2;
  radius: number;
  levels: [number, number];
  stats: TowerStats;
  /** Total money spent, used for selling. */
  spent: number;
  cooldown: number;
  targetMode: TargetMode;
  facing: 1 | -1;
  /** Seconds left of the attack animation (visual). */
  attackAnim: number;
  /** Attack-speed buff from nearby Psi chór (1 = none). */
  cdMult: number;
  trapSpots: TrapSpot[];
  cookieTimer: number;
  tsunamiTimer: number;
  pops: number;
}

export const TARGET_MODES: TargetMode[] = ['first', 'last', 'strong', 'close'];

export function createTower(uid: number, def: TowerDef, pos: Vec2, price: number): Tower {
  const stats = computeStats(def, [0, 0]);
  return {
    uid,
    def,
    pos: { ...pos },
    radius: def.radius,
    levels: [0, 0],
    stats,
    spent: price,
    cooldown: 0,
    targetMode: def.defaultTarget,
    facing: 1,
    attackAnim: 0,
    cdMult: 1,
    trapSpots: [],
    cookieTimer: stats.cookieInterval,
    tsunamiTimer: stats.tsunamiInterval,
    pops: 0,
  };
}

/** Levels allowed: up to 3 in one path, and once a path hits 3 the other may have at most 1. */
export function levelsAllowed(levels: readonly [number, number]): boolean {
  const [a, b] = levels;
  if (a < 0 || b < 0 || a > MAX_LEVEL || b > MAX_LEVEL) return false;
  if ((a === MAX_LEVEL && b > 1) || (b === MAX_LEVEL && a > 1)) return false;
  return true;
}

export function canUpgrade(t: Tower, path: 0 | 1): boolean {
  const next: [number, number] = [t.levels[0], t.levels[1]];
  next[path]++;
  return levelsAllowed(next);
}

/** Base (undiscounted) cost of the next upgrade on a path, or null if unavailable. */
export function nextUpgradeBaseCost(t: Tower, path: 0 | 1): number | null {
  if (!canUpgrade(t, path)) return null;
  return t.def.paths[path][t.levels[path]]?.cost ?? null;
}

export function applyUpgrade(t: Tower, path: 0 | 1, price: number): void {
  t.levels[path]++;
  t.spent += price;
  const prevInterval = t.stats.tsunamiInterval;
  t.stats = computeStats(t.def, t.levels);
  if (prevInterval === 0 && t.stats.tsunamiInterval > 0) t.tsunamiTimer = t.stats.tsunamiInterval;
  t.cookieTimer = Math.min(t.cookieTimer, t.stats.cookieInterval);
}

export function towerSellValue(t: Tower): number {
  return sellValue(t.spent);
}

/** Highest single-path level, used for visuals. */
export function towerTier(t: Tower): number {
  return Math.max(t.levels[0], t.levels[1]);
}

export function canSee(t: Tower, e: Enemy): boolean {
  return !e.def.camo || t.stats.camoDetect;
}

export function inRange(t: Tower, e: Enemy): boolean {
  return dist(t.pos, e.pos) <= t.stats.range + e.def.radius;
}

export function progress(e: Enemy, paths: readonly Path[]): number {
  const p = paths[e.pathIndex];
  return p ? e.dist / p.length : 0;
}

/** Choose a visible enemy in range according to the tower's target mode. */
export function pickTarget(
  t: Tower,
  enemies: readonly Enemy[],
  paths: readonly Path[],
  filter?: (e: Enemy) => boolean,
): Enemy | null {
  let best: Enemy | null = null;
  let bestScore = -Infinity;
  for (const e of enemies) {
    if (!e.alive || !canSee(t, e) || !inRange(t, e)) continue;
    if (filter && !filter(e)) continue;
    const prog = progress(e, paths);
    let score: number;
    switch (t.targetMode) {
      case 'first':
        score = prog;
        break;
      case 'last':
        score = -prog;
        break;
      case 'strong':
        score = e.maxHp + prog * 0.99;
        break;
      case 'close':
        score = -dist(t.pos, e.pos);
        break;
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/** Points along the paths within the tower's range, where a Kopacz can bury traps. */
export function computeTrapSpots(t: Tower, paths: readonly Path[]): TrapSpot[] {
  const spots: TrapSpot[] = [];
  paths.forEach((path, pathIndex) => {
    for (const s of path.sample(6)) {
      if (dist(s.p, t.pos) <= t.stats.range && s.p.x > 0 && s.p.y > 0 && s.p.x < 960 && s.p.y < 640) {
        spots.push({ pathIndex, d: s.d });
      }
    }
  });
  return spots;
}
