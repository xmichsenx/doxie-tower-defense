import { describe, expect, it } from 'vitest';
import { GameWorld } from '../src/sim/world';

const SPOTS = [
  { x: 160, y: 200 },
  { x: 320, y: 400 },
  { x: 512, y: 300 },
  { x: 704, y: 300 },
  { x: 848, y: 300 },
];

/** Run until the current wave ends (or the game is lost). Returns seconds simulated. */
function playWave(w: GameWorld): number {
  w.startWave();
  let steps = 0;
  while (w.phase === 'wave' && steps < 60 * 300) {
    w.step(1 / 60);
    steps++;
  }
  return steps / 60;
}

function defended(seed: number): GameWorld {
  const w = new GameWorld({ mapId: 'salon', difficulty: 'normal', seed });
  w.money = 100000;
  for (const p of SPOTS) {
    const t = w.placeTower('rzucacz', p);
    expect(t, `spot ${p.x},${p.y}`).not.toBeNull();
    w.upgradeTower(t!, 1);
  }
  return w;
}

describe('headless simulation', () => {
  it('a few Rzucacze hold waves 1–5 without leaks', () => {
    const w = defended(7);
    for (let i = 1; i <= 5; i++) {
      playWave(w);
      expect(w.phase, `wave ${i}`).toBe('idle');
    }
    expect(w.lives).toBe(100);
    expect(w.stats.leaked).toBe(0);
    expect(w.stats.pops).toBeGreaterThan(100);
  });

  it('without jamniki the vacuums leak and take lives', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    playWave(w);
    expect(w.lives).toBe(100 - 20);
    expect(w.phase).toBe('idle');
  });

  it('the game is lost when lives run out', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'hard' });
    let guard = 0;
    while (w.phase !== 'lost' && guard++ < 20) playWave(w);
    expect(w.phase).toBe('lost');
    expect(w.lives).toBe(0);
    expect(w.startWave()).toBe(false);
    expect(w.drainEvents().some((e) => e.type === 'lost')).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const run = (seed: number) => {
      const w = defended(seed);
      w.placeTower('kopacz', { x: 300, y: 220 });
      for (let i = 0; i < 3; i++) playWave(w);
      return { money: w.money, pops: w.stats.pops, traps: w.traps.length, time: w.time };
    };
    expect(run(11)).toEqual(run(11));
  });

  it('beating wave 40 wins, and endless continues afterwards', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    w.setNextWave(40);
    w.startWave();
    let guard = 0;
    while (w.phase === 'wave' && guard++ < 60 * 300) {
      for (const e of w.enemies) e.alive = false;
      w.step(1 / 60);
    }
    expect(w.phase).toBe('won');
    w.continueEndless();
    expect(w.phase).toBe('idle');
    expect(w.startWave()).toBe(true);
    expect(w.wave).toBe(41);
  });
});
