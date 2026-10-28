import { describe, expect, it } from 'vitest';
import { TOWERS, computeStats } from '../src/data/towers';
import { createEnemy } from '../src/sim/enemy';
import { canUpgrade, createTower, levelsAllowed, pickTarget, towerSellValue } from '../src/sim/tower';
import { GameWorld } from '../src/sim/world';
import { makeFactory, straightPath } from './helpers';

function setup() {
  const path = straightPath();
  const f = makeFactory();
  const tower = createTower(1, TOWERS.rzucacz, { x: 500, y: 150 }, 200);
  // Three enemies in range at different progress, plus one far behind.
  const back = createEnemy('reczny', path, 0, 420, f);
  const strong = createEnemy('pionowy', path, 0, 470, f);
  const front = createEnemy('reczny', path, 0, 560, f);
  const outOfRange = createEnemy('przemyslowy', path, 0, 100, f);
  return { path, tower, enemies: [back, strong, front, outOfRange], back, strong, front, outOfRange };
}

describe('targeting', () => {
  it('first picks the enemy furthest along', () => {
    const { tower, enemies, path, front } = setup();
    tower.targetMode = 'first';
    expect(pickTarget(tower, enemies, [path])).toBe(front);
  });

  it('last picks the enemy least far along (in range)', () => {
    const { tower, enemies, path, back } = setup();
    tower.targetMode = 'last';
    expect(pickTarget(tower, enemies, [path])).toBe(back);
  });

  it('strong picks the toughest enemy', () => {
    const { tower, enemies, path, strong } = setup();
    tower.targetMode = 'strong';
    expect(pickTarget(tower, enemies, [path])).toBe(strong);
  });

  it('close picks the nearest enemy', () => {
    const { tower, enemies, path, strong } = setup();
    tower.targetMode = 'close';
    expect(pickTarget(tower, enemies, [path])).toBe(strong);
  });

  it('ignores enemies out of range and dead ones', () => {
    const { tower, path, outOfRange, front } = setup();
    expect(pickTarget(tower, [outOfRange], [path])).toBeNull();
    front.alive = false;
    expect(pickTarget(tower, [front], [path])).toBeNull();
  });

  it('cannot see camo without detection', () => {
    const path = straightPath();
    const cien = createEnemy('cien', path, 0, 500, makeFactory());
    const sniper = createTower(1, TOWERS.snajper, { x: 500, y: 150 }, 350);
    expect(pickTarget(sniper, [cien], [path])).toBeNull();
    sniper.levels = [1, 0];
    sniper.stats = computeStats(sniper.def, sniper.levels);
    expect(pickTarget(sniper, [cien], [path])).toBe(cien);
  });
});

describe('upgrades', () => {
  it('limits paths to 3 and the other to 1 once one reaches 3', () => {
    expect(levelsAllowed([2, 2])).toBe(true);
    expect(levelsAllowed([3, 1])).toBe(true);
    expect(levelsAllowed([3, 2])).toBe(false);
    expect(levelsAllowed([1, 3])).toBe(true);
    expect(levelsAllowed([4, 0])).toBe(false);

    const t = createTower(1, TOWERS.rzucacz, { x: 0, y: 0 }, 200);
    t.levels = [2, 2];
    expect(canUpgrade(t, 0)).toBe(false);
    expect(canUpgrade(t, 1)).toBe(false);
    t.levels = [2, 1];
    expect(canUpgrade(t, 0)).toBe(true);
  });

  it('changes stats in order', () => {
    const base = computeStats(TOWERS.rzucacz, [0, 0]);
    const a2 = computeStats(TOWERS.rzucacz, [2, 0]);
    const b1 = computeStats(TOWERS.rzucacz, [0, 1]);
    expect(base.pierce).toBe(2);
    expect(a2.pierce).toBe(5);
    expect(a2.range).toBe(base.range + 15);
    expect(b1.cooldown).toBeCloseTo(base.cooldown * 0.75);
    // Base stats are not mutated by upgrades.
    expect(computeStats(TOWERS.rzucacz, [0, 0])).toEqual(base);
  });

  it('world upgrades charge money and track spending', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    w.money = 5000;
    const t = w.placeTower('rzucacz', { x: 300, y: 220 })!;
    expect(w.upgradeTower(t, 0)).toBe(true);
    expect(t.levels).toEqual([1, 0]);
    expect(t.spent).toBe(200 + 120);
    expect(w.money).toBe(5000 - 320);
    w.money = 0;
    expect(w.upgradeTower(t, 0)).toBe(false);
  });

  it('sells for 70% of everything spent', () => {
    const t = createTower(1, TOWERS.rzucacz, { x: 0, y: 0 }, 200);
    t.spent = 1000;
    expect(towerSellValue(t)).toBe(700);
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    const placed = w.placeTower('rzucacz', { x: 300, y: 220 })!;
    expect(w.sellTower(placed)).toBe(140);
    expect(w.money).toBe(650 - 200 + 140);
    expect(w.towers).toHaveLength(0);
  });

  it('cycles through target modes', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    const t = w.placeTower('rzucacz', { x: 300, y: 220 })!;
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      seen.add(t.targetMode);
      w.cycleTargetMode(t);
    }
    expect(seen.size).toBe(4);
  });
});

describe('cooldown and range in the world', () => {
  it('fires only when an enemy is in range and respects cooldown', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    const t = w.placeTower('rzucacz', { x: 300, y: 220 })!;
    w.phase = 'wave';
    w.step(1 / 60);
    expect(w.projectiles).toHaveLength(0);

    // Put an enemy on the path right next to the tower (x=224 segment).
    const e = w.spawn('megassak', 0);
    e.dist = 264 + 100; // on the vertical segment at x=224, y≈196
    e.speedMult = 0;
    w.drainEvents();
    const attacks = (seconds: number) => {
      for (let i = 0; i < Math.round(seconds * 60); i++) w.step(1 / 60);
      return w.drainEvents().filter((ev) => ev.type === 'attack').length;
    };
    expect(attacks(0.5)).toBe(1);
    expect(t.cooldown).toBeGreaterThan(0);
    // Cooldown 0.9 s: 1.8 s later it has thrown twice more.
    expect(attacks(1.8)).toBe(2);
  });
});
