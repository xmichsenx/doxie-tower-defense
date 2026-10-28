import { describe, expect, it } from 'vitest';
import { WAVES, endlessWave, getWave } from '../src/data/waves';
import { waveBonus } from '../src/sim/economy';
import { WaveSpawner, waveEnemyCount } from '../src/sim/waves';
import { GameWorld } from '../src/sim/world';

describe('WaveSpawner', () => {
  it('releases the right number of enemies at the right intervals', () => {
    const s = new WaveSpawner({ groups: [{ enemy: 'reczny', count: 3, interval: 1, delay: 0 }], hpMult: 1, speedMult: 1 });
    expect(s.update(0.01)).toEqual(['reczny']);
    expect(s.update(0.5)).toEqual([]);
    expect(s.update(0.5)).toEqual(['reczny']);
    expect(s.done).toBe(false);
    expect(s.update(1)).toEqual(['reczny']);
    expect(s.done).toBe(true);
    expect(s.update(5)).toEqual([]);
  });

  it('honours group delays and catches up on large steps', () => {
    const s = new WaveSpawner({
      groups: [
        { enemy: 'reczny', count: 2, interval: 0.1, delay: 0 },
        { enemy: 'pionowy', count: 2, interval: 0.1, delay: 2 },
      ],
      hpMult: 1,
      speedMult: 1,
    });
    expect(s.update(1)).toEqual(['reczny', 'reczny']);
    expect(s.remaining).toBe(2);
    expect(s.update(1.5)).toEqual(['pionowy', 'pionowy']);
  });

  it('counts wave enemies', () => {
    expect(waveEnemyCount(WAVES[0]!)).toBe(20);
  });
});

describe('wave data', () => {
  it('has 40 waves and a boss in the last one', () => {
    expect(WAVES).toHaveLength(40);
    expect(WAVES[39]!.groups.some((g) => g.enemy === 'megassak')).toBe(true);
  });

  it('endless waves scale hp and speed', () => {
    const a = endlessWave(41);
    const b = endlessWave(60);
    expect(a.hpMult).toBeGreaterThan(1);
    expect(b.hpMult).toBeGreaterThan(a.hpMult);
    expect(b.speedMult).toBeGreaterThanOrEqual(a.speedMult);
    expect(getWave(41).groups.length).toBeGreaterThan(0);
    expect(() => getWave(0)).toThrow();
  });
});

describe('wave flow in the world', () => {
  it('a wave only ends once every enemy is gone', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    expect(w.startWave()).toBe(true);
    expect(w.startWave()).toBe(false);
    for (let i = 0; i < 60 * 20; i++) w.step(1 / 60);
    // All 20 spawned (0.9 s apart) but they are still on the carpet.
    expect(w.spawnsRemaining).toBe(0);
    expect(w.enemies.length).toBeGreaterThan(0);
    expect(w.phase).toBe('wave');
    for (const e of w.enemies) e.alive = false;
    w.step(1 / 60);
    expect(w.phase).toBe('idle');
    expect(w.money).toBe(650 + waveBonus(1));
  });

  it('endless mode applies multipliers to spawned vacuums', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    w.setNextWave(45);
    w.startWave();
    for (let i = 0; i < 60 * 3; i++) w.step(1 / 60);
    const e = w.enemies[0]!;
    expect(e.maxHp).toBeGreaterThan(e.def.hp);
    expect(e.speedMult).toBeGreaterThan(1);
  });

  it('alternates spawns between paths on two-path maps', () => {
    const w = new GameWorld({ mapId: 'ogrod', difficulty: 'normal' });
    w.startWave();
    for (let i = 0; i < 60 * 3; i++) w.step(1 / 60);
    const paths = new Set(w.enemies.map((e) => e.pathIndex));
    expect(paths).toEqual(new Set([0, 1]));
  });
});
