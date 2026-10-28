import type { Path } from '../core/path';
import type { DamageType, EnemyId, Vec2 } from '../core/types';
import { ENEMIES, ENEMY_SPEED_UNIT, defLeakValue, type EnemyDef } from '../data/enemies';
import type { SlowEffect } from '../data/towers';

export interface Enemy {
  uid: number;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  pathIndex: number;
  /** Distance travelled along its path. */
  dist: number;
  pos: Vec2;
  dir: Vec2;
  speedMult: number;
  slowFactor: number;
  slowTime: number;
  stunTime: number;
  /** Ids of projectiles/traps that already hit this enemy (inherited by children). */
  hitBy: Set<number>;
  alive: boolean;
  /** Seconds left of the white hit flash (visual only). */
  flash: number;
}

export interface EnemyFactory {
  nextUid(): number;
  hpMult: number;
  speedMult: number;
}

export function createEnemy(id: EnemyId, path: Path, pathIndex: number, dist: number, factory: EnemyFactory): Enemy {
  const def = ENEMIES[id];
  const maxHp = Math.ceil(def.hp * factory.hpMult);
  return {
    uid: factory.nextUid(),
    def,
    hp: maxHp,
    maxHp,
    pathIndex,
    dist,
    pos: path.pointAt(dist),
    dir: path.dirAt(dist),
    speedMult: factory.speedMult,
    slowFactor: 1,
    slowTime: 0,
    stunTime: 0,
    hitBy: new Set(),
    alive: true,
    flash: 0,
  };
}

export function currentSpeed(e: Enemy): number {
  if (e.stunTime > 0) return 0;
  const slow = e.slowTime > 0 ? e.slowFactor : 1;
  return e.def.speed * ENEMY_SPEED_UNIT * e.speedMult * slow;
}

/** Advance along the path. Returns true when the enemy reached the end. */
export function moveEnemy(e: Enemy, path: Path, dt: number): boolean {
  e.dist += currentSpeed(e) * dt;
  if (e.stunTime > 0) e.stunTime = Math.max(0, e.stunTime - dt);
  if (e.slowTime > 0) e.slowTime = Math.max(0, e.slowTime - dt);
  if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
  e.pos = path.pointAt(e.dist);
  e.dir = path.dirAt(e.dist);
  return e.dist >= path.length;
}

export function canDamage(def: EnemyDef, type: DamageType, armorPierce: boolean): boolean {
  if (def.waterImmune && type === 'water') return false;
  if (def.armored && !armorPierce && (type === 'sharp' || type === 'sound')) return false;
  return true;
}

/** Lives this enemy takes when it leaks: remaining HP plus everything inside it. */
export function leakValue(e: Enemy): number {
  return Math.ceil(e.hp) + e.def.children.reduce((sum, c) => sum + c.count * defLeakValue(c.id), 0);
}

export function applySlow(e: Enemy, slow: SlowEffect): void {
  const factor = e.def.boss ? 1 - (1 - slow.factor) / 2 : slow.factor;
  if (e.slowTime <= 0 || factor <= e.slowFactor) {
    e.slowFactor = factor;
    e.slowTime = Math.max(e.slowTime, slow.duration);
  }
}

export function applyStun(e: Enemy, duration: number): void {
  if (e.def.boss || duration <= 0) return;
  e.stunTime = Math.max(e.stunTime, duration);
}

export interface DamageResult {
  /** False when the damage type cannot hurt this enemy (e.g. sharp vs armor). */
  dealt: boolean;
  /** The enemy and any children destroyed by overflow damage. */
  killed: Enemy[];
  /** Children that came out alive. */
  spawned: Enemy[];
}

/**
 * Deal damage. When the enemy is destroyed its children appear just behind it,
 * inheriting its hit set; excess damage carries over into the first child.
 */
export function damageEnemy(
  e: Enemy,
  amount: number,
  type: DamageType,
  armorPierce: boolean,
  path: Path,
  factory: EnemyFactory,
): DamageResult {
  const result: DamageResult = { dealt: false, killed: [], spawned: [] };
  if (!e.alive || amount <= 0) return result;
  if (!canDamage(e.def, type, armorPierce)) return result;
  result.dealt = true;
  e.flash = 0.08;
  e.hp -= amount;
  if (e.hp > 0) return result;

  const excess = -e.hp;
  e.hp = 0;
  e.alive = false;
  result.killed.push(e);

  let index = 0;
  for (const child of e.def.children) {
    for (let i = 0; i < child.count; i++) {
      const c = createEnemy(child.id, path, e.pathIndex, Math.max(0, e.dist - index * 7), factory);
      c.hitBy = new Set(e.hitBy);
      c.slowFactor = e.slowFactor;
      c.slowTime = e.slowTime;
      if (index === 0 && excess > 0) {
        const sub = damageEnemy(c, excess, type, armorPierce, path, factory);
        result.killed.push(...sub.killed);
        result.spawned.push(...sub.spawned);
        if (c.alive) result.spawned.push(c);
      } else {
        result.spawned.push(c);
      }
      index++;
    }
  }
  return result;
}
