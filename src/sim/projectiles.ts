import { dist, dist2 } from '../core/math';
import type { DamageType, Vec2 } from '../core/types';
import type { SlowEffect } from '../data/towers';
import type { Enemy } from './enemy';

export type ProjectileKind = 'bone' | 'bomb' | 'shrapnel';

export interface Boomerang {
  origin: Vec2;
  maxDist: number;
  traveled: number;
  returning: boolean;
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  pos: Vec2;
  vel: Vec2;
  damage: number;
  pierce: number;
  damageType: DamageType;
  armorPierce: boolean;
  life: number;
  radius: number;
  splash: number;
  shrapnel: number;
  stun: number;
  slow: SlowEffect | null;
  ownerUid: number;
  boomerang: Boomerang | null;
  /** Rotation for drawing. */
  spin: number;
  alive: boolean;
}

export interface Trap {
  id: number;
  pos: Vec2;
  damage: number;
  pierce: number;
  damageType: DamageType;
  armorPierce: boolean;
  slow: SlowEffect | null;
  instakillSmall: boolean;
  life: number;
  ownerUid: number;
  alive: boolean;
  /** Visual variant. */
  variant: 'bone' | 'glue' | 'mine';
}

export interface Cookie {
  id: number;
  pos: Vec2;
  value: number;
  ttl: number;
  ownerUid: number;
}

export const TRAP_RADIUS = 12;
export const COOKIE_TTL = 6;
export const COOKIE_RADIUS = 14;

export function touches(pos: Vec2, radius: number, e: Enemy): boolean {
  const r = radius + e.def.radius;
  return dist2(pos, e.pos) <= r * r;
}

export function enemiesInRadius(enemies: readonly Enemy[], pos: Vec2, radius: number): Enemy[] {
  return enemies.filter((e) => e.alive && touches(pos, radius, e));
}

/**
 * Chain lightning: starting from `first`, repeatedly jump to the nearest
 * not-yet-hit eligible enemy within `range`, up to `jumps` extra enemies.
 */
export function chainTargets(
  first: Enemy,
  enemies: readonly Enemy[],
  jumps: number,
  range: number,
  eligible: (e: Enemy) => boolean,
): Enemy[] {
  const chain = [first];
  const used = new Set([first.uid]);
  let current = first;
  for (let i = 0; i < jumps; i++) {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.alive || used.has(e.uid) || !eligible(e)) continue;
      const d = dist(current.pos, e.pos);
      if (d <= range && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) break;
    chain.push(best);
    used.add(best.uid);
    current = best;
  }
  return chain;
}
