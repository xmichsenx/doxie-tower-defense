import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_SPEED_UNIT, defLeakValue, familyReward } from '../src/data/enemies';
import { applySlow, applyStun, canDamage, createEnemy, damageEnemy, leakValue, moveEnemy } from '../src/sim/enemy';
import { makeFactory, straightPath } from './helpers';

describe('enemy movement', () => {
  it('moves at its speed along the path', () => {
    const path = straightPath();
    const e = createEnemy('reczny', path, 0, 0, makeFactory());
    moveEnemy(e, path, 1);
    expect(e.dist).toBeCloseTo(ENEMIES.reczny.speed * ENEMY_SPEED_UNIT);
    expect(e.pos.x).toBeCloseTo(e.dist);
    expect(e.pos.y).toBe(100);
  });

  it('reports reaching the end', () => {
    const path = straightPath();
    const e = createEnemy('robot', path, 0, 990, makeFactory());
    expect(moveEnemy(e, path, 1)).toBe(true);
  });

  it('is slowed and stunned', () => {
    const path = straightPath();
    const e = createEnemy('reczny', path, 0, 0, makeFactory());
    applySlow(e, { factor: 0.5, duration: 5 });
    moveEnemy(e, path, 1);
    expect(e.dist).toBeCloseTo(ENEMY_SPEED_UNIT * 0.5);
    applyStun(e, 1);
    const before = e.dist;
    moveEnemy(e, path, 0.5);
    expect(e.dist).toBe(before);
  });

  it('applies wave speed and hp multipliers', () => {
    const e = createEnemy('workowy', straightPath(), 0, 0, makeFactory(2.5, 1.5));
    expect(e.maxHp).toBe(Math.ceil(3 * 2.5));
    expect(e.speedMult).toBe(1.5);
  });

  it('bosses ignore stuns and are slowed less', () => {
    const e = createEnemy('megassak', straightPath(), 0, 0, makeFactory());
    applyStun(e, 2);
    expect(e.stunTime).toBe(0);
    applySlow(e, { factor: 0.5, duration: 1 });
    expect(e.slowFactor).toBe(0.75);
  });
});

describe('enemy damage', () => {
  it('loses hp without dying', () => {
    const path = straightPath();
    const e = createEnemy('workowy', path, 0, 100, makeFactory());
    const r = damageEnemy(e, 1, 'sharp', false, path, makeFactory());
    expect(r.dealt).toBe(true);
    expect(e.hp).toBe(2);
    expect(r.killed).toHaveLength(0);
  });

  it('splits into its children at its position when destroyed', () => {
    const path = straightPath();
    const f = makeFactory();
    const e = createEnemy('pionowy', path, 0, 300, f);
    const r = damageEnemy(e, 6, 'sharp', false, path, f);
    expect(e.alive).toBe(false);
    expect(r.killed).toEqual([e]);
    expect(r.spawned.map((c) => c.def.id)).toEqual(['workowy', 'workowy']);
    for (const c of r.spawned) {
      expect(c.dist).toBeLessThanOrEqual(300);
      expect(c.dist).toBeGreaterThan(280);
    }
  });

  it('carries overflow damage into the first child', () => {
    const path = straightPath();
    const f = makeFactory();
    // workowy (3) -> reczny (1): 4 damage destroys both.
    const e = createEnemy('workowy', path, 0, 100, f);
    const r = damageEnemy(e, 4, 'sharp', false, path, f);
    expect(r.killed.map((k) => k.def.id)).toEqual(['workowy', 'reczny']);
    expect(r.spawned).toHaveLength(0);

    // pionowy (6) with 8 damage: first workowy takes 2, second is untouched.
    const p = createEnemy('pionowy', path, 0, 100, f);
    const r2 = damageEnemy(p, 8, 'sharp', false, path, f);
    expect(r2.spawned.map((c) => c.hp).sort()).toEqual([1, 3]);
  });

  it('children inherit the hit set so one bone cannot hit them again', () => {
    const path = straightPath();
    const f = makeFactory();
    const e = createEnemy('workowy', path, 0, 100, f);
    e.hitBy.add(77);
    const r = damageEnemy(e, 3, 'sharp', false, path, f);
    expect(r.spawned[0]!.hitBy.has(77)).toBe(true);
  });

  it('armor blocks sharp and sound damage unless pierced', () => {
    const armored = ENEMIES.przemyslowy;
    expect(canDamage(armored, 'sharp', false)).toBe(false);
    expect(canDamage(armored, 'sound', false)).toBe(false);
    expect(canDamage(armored, 'sound', true)).toBe(true);
    expect(canDamage(armored, 'explosive', true)).toBe(true);
    expect(canDamage(armored, 'blunt', true)).toBe(true);

    const path = straightPath();
    const e = createEnemy('przemyslowy', path, 0, 0, makeFactory());
    const r = damageEnemy(e, 5, 'sharp', false, path, makeFactory());
    expect(r.dealt).toBe(false);
    expect(e.hp).toBe(20);
  });

  it('steam cleaners are immune to water', () => {
    expect(canDamage(ENEMIES.parowy, 'water', true)).toBe(false);
    expect(canDamage(ENEMIES.parowy, 'sharp', false)).toBe(true);
  });

  it('counts leak value including everything inside', () => {
    expect(defLeakValue('reczny')).toBe(1);
    expect(defLeakValue('workowy')).toBe(4);
    expect(defLeakValue('pionowy')).toBe(6 + 2 * 4);
    const path = straightPath();
    const e = createEnemy('pionowy', path, 0, 0, makeFactory());
    e.hp = 2;
    expect(leakValue(e)).toBe(2 + 8);
  });

  it('family reward sums the whole tree', () => {
    expect(familyReward('reczny')).toBe(1);
    expect(familyReward('workowy')).toBe(2 + 1);
    expect(familyReward('pionowy')).toBe(4 + 2 * 3);
  });
});
