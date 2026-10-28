import { describe, expect, it } from 'vitest';
import { familyReward } from '../src/data/enemies';
import { TOWERS, computeStats } from '../src/data/towers';
import type { Enemy } from '../src/sim/enemy';
import { chainTargets, enemiesInRadius } from '../src/sim/projectiles';
import type { Tower } from '../src/sim/tower';
import { GameWorld } from '../src/sim/world';

/** Salon path segment from (416,512) up to (416,160) starts at this distance. */
const VERTICAL_START = 264 + 192 + 128 + 224 + 320;

function world(): GameWorld {
  const w = new GameWorld({ mapId: 'salon', difficulty: 'normal', seed: 1 });
  w.money = 1e6;
  w.phase = 'wave';
  return w;
}

/** Enemy frozen on the vertical x=416 segment at the given y. */
function frozen(w: GameWorld, id: Parameters<GameWorld['spawn']>[0], y: number): Enemy {
  const e = w.spawn(id, 0);
  e.dist = VERTICAL_START + (512 - y);
  e.speedMult = 0;
  e.pos = w.paths[0]!.pointAt(e.dist);
  return e;
}

function setLevels(t: Tower, a: number, b: number): void {
  t.levels = [a, b];
  t.stats = computeStats(t.def, t.levels);
}

function run(w: GameWorld, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) w.step(1 / 60);
}

describe('helpers', () => {
  it('finds enemies in a radius', () => {
    const w = world();
    const a = frozen(w, 'reczny', 300);
    frozen(w, 'reczny', 200);
    expect(enemiesInRadius(w.enemies, { x: 416, y: 300 }, 20)).toEqual([a]);
  });

  it('chains to the nearest eligible enemies', () => {
    const w = world();
    const a = frozen(w, 'reczny', 400);
    const b = frozen(w, 'reczny', 350);
    const c = frozen(w, 'reczny', 300);
    const steam = frozen(w, 'parowy', 375);
    frozen(w, 'reczny', 170); // too far from c
    const chain = chainTargets(a, w.enemies, 5, 60, (e) => !e.def.waterImmune);
    expect(chain).toEqual([a, b, c]);
    expect(chain).not.toContain(steam);
  });
});

describe('projectiles in the world', () => {
  it('a piercing bone hits several vacuums, each only once', () => {
    const w = world();
    const t = w.placeTower('rzucacz', { x: 470, y: 330 })!;
    setLevels(t, 2, 0); // pierce 4
    t.targetMode = 'first';
    const line = [400, 380, 360, 340].map((y) => frozen(w, 'workowy', y));
    // Single throw at a vertical line of vacuums: aim straight up the path.
    t.pos = { x: 416, y: 470 };
    run(w, 0.5);
    const damaged = line.filter((e) => e.hp < 3 || !e.alive);
    expect(damaged.length).toBeGreaterThanOrEqual(2);
    expect(line.every((e) => !e.alive || e.hp >= 2)).toBe(true);
  });

  it('bombs damage everything in the splash radius, armor included', () => {
    const w = world();
    const t = w.placeTower('kucharz', { x: 470, y: 300 })!;
    const armored = frozen(w, 'przemyslowy', 300);
    const near = frozen(w, 'pionowy', 330);
    run(w, 0.4);
    expect(armored.hp).toBeLessThan(armored.maxHp);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(t.pops).toBe(0);
  });

  it('water chains skip steam cleaners', () => {
    const w = world();
    w.placeTower('strazak', { x: 470, y: 300 });
    const steam = frozen(w, 'parowy', 300);
    const vac = frozen(w, 'pionowy', 320);
    run(w, 0.1);
    expect(steam.hp).toBe(steam.maxHp);
    expect(vac.hp).toBeLessThan(vac.maxHp);
  });

  it('barking hits camo, slows and stuns', () => {
    const w = world();
    const t = w.placeTower('szczekacz', { x: 460, y: 300 })!;
    setLevels(t, 0, 2);
    const cien = frozen(w, 'cien', 300);
    run(w, 0.05);
    expect(cien.hp).toBe(cien.maxHp - 1);
    expect(cien.slowTime).toBeGreaterThan(0);
    expect(cien.stunTime).toBeGreaterThan(0);
  });

  it('barking does not hurt armor but still slows it', () => {
    const w = world();
    const t = w.placeTower('szczekacz', { x: 460, y: 300 })!;
    setLevels(t, 0, 1);
    const tank = frozen(w, 'przemyslowy', 300);
    run(w, 0.05);
    expect(tank.hp).toBe(tank.maxHp);
    expect(tank.slowTime).toBeGreaterThan(0);
  });

  it('the sniper hits armor from anywhere', () => {
    const w = world();
    w.placeTower('snajper', { x: 60, y: 600 });
    const tank = frozen(w, 'przemyslowy', 200);
    run(w, 0.05);
    expect(tank.hp).toBe(tank.maxHp - 2);
  });

  it('kopacz buries traps on the path that hurt passing vacuums', () => {
    const w = world();
    const t = w.placeTower('kopacz', { x: 470, y: 300 })!;
    expect(t.trapSpots.length).toBeGreaterThan(0);
    run(w, 2.5);
    expect(w.traps.length).toBeGreaterThan(0);
    const trap = w.traps[0]!;
    const e = w.spawn('workowy', 0);
    e.speedMult = 0;
    e.dist = 0;
    e.pos = { ...trap.pos };
    run(w, 1 / 60);
    expect(e.hp).toBeLessThan(3);
    expect(trap.pierce).toBe(t.stats.pierce - 1);
  });

  it('zapadnia removes small vacuums whole', () => {
    const w = world();
    const t = w.placeTower('kopacz', { x: 470, y: 300 })!;
    setLevels(t, 1, 3);
    run(w, 2.5);
    const trap = w.traps[0]!;
    const e = w.spawn('pionowy', 0);
    e.speedMult = 0;
    e.pos = { ...trap.pos };
    const money = w.money;
    run(w, 1 / 60);
    expect(e.alive).toBe(false);
    expect(w.enemies.filter((x) => x.def.id === 'workowy')).toHaveLength(0);
    expect(w.money - money).toBe(familyReward('pionowy'));
  });

  it('psi chór speeds up nearby towers', () => {
    const w = world();
    const chor = w.placeTower('szczekacz', { x: 470, y: 300 })!;
    setLevels(chor, 0, 3);
    const near = w.placeTower('rzucacz', { x: 520, y: 300 })!;
    const far = w.placeTower('rzucacz', { x: 300, y: 220 })!;
    w.step(1 / 60);
    expect(near.cdMult).toBe(TOWERS.szczekacz.paths[1][2]!.name === 'Psi chór' ? 0.8 : -1);
    expect(far.cdMult).toBe(1);
  });

  it('tsunami floods every vacuum on the map', () => {
    const w = world();
    const t = w.placeTower('strazak', { x: 60, y: 600 })!;
    setLevels(t, 0, 3);
    t.tsunamiTimer = 0.01;
    const a = frozen(w, 'przemyslowy', 200);
    const steam = frozen(w, 'parowy', 400);
    run(w, 0.05);
    expect(a.hp).toBe(a.maxHp - 5);
    expect(steam.hp).toBe(steam.maxHp);
  });
});
