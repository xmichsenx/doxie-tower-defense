import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, START_MONEY, interest, priceFor, sellValue, waveBonus } from '../src/sim/economy';
import { GameWorld } from '../src/sim/world';

describe('economy', () => {
  it('starts with $650 and lives by difficulty', () => {
    expect(START_MONEY).toBe(650);
    expect(new GameWorld({ mapId: 'salon', difficulty: 'easy' }).lives).toBe(200);
    expect(new GameWorld({ mapId: 'salon', difficulty: 'normal' }).lives).toBe(100);
    expect(new GameWorld({ mapId: 'salon', difficulty: 'hard' }).lives).toBe(50);
    expect(new GameWorld({ mapId: 'salon', difficulty: 'hard' }).money).toBe(650);
  });

  it('adjusts prices by difficulty, rounded to $5', () => {
    expect(priceFor(200, 'normal')).toBe(200);
    expect(priceFor(200, 'easy')).toBe(170);
    expect(priceFor(200, 'hard')).toBe(215);
    expect(priceFor(3, 'easy')).toBe(5);
    expect(DIFFICULTIES.hard.priceMult).toBeGreaterThan(DIFFICULTIES.easy.priceMult);
  });

  it('pays a wave bonus and sells at 70%', () => {
    expect(waveBonus(1)).toBe(102);
    expect(waveBonus(40)).toBe(180);
    expect(sellValue(1000)).toBe(700);
    expect(sellValue(215)).toBe(150);
  });

  it('calculates capped interest', () => {
    expect(interest(1000, 0.05, 300)).toBe(50);
    expect(interest(100000, 0.05, 300)).toBe(300);
    expect(interest(1000, 0, 300)).toBe(0);
  });

  it('rewards destroyed vacuums', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    w.placeTower('snajper', { x: 300, y: 220 });
    w.money = 0;
    w.phase = 'wave';
    const e = w.spawn('reczny', 0);
    e.dist = 150;
    for (let i = 0; i < 5; i++) w.step(1 / 60);
    expect(e.alive).toBe(false);
    expect(w.money).toBe(1);
  });

  it('piekarz bakes cookies during waves that turn into money', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal', seed: 3 });
    w.money = 600;
    w.placeTower('piekarz', { x: 300, y: 220 });
    expect(w.money).toBe(0);
    // Outside a wave nothing is baked.
    for (let i = 0; i < 300; i++) w.step(1 / 60);
    expect(w.cookies).toHaveLength(0);
    w.phase = 'wave';
    for (let i = 0; i < 4.1 * 60; i++) w.step(1 / 60);
    expect(w.cookies).toHaveLength(1);
    const c = w.cookies[0]!;
    expect(w.collectCookie(c.id)).toBe(true);
    expect(w.money).toBe(12);
    expect(w.collectCookie(c.id)).toBe(false);
  });

  it('uncollected cookies are picked up automatically', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal', seed: 3 });
    w.placeTower('piekarz', { x: 300, y: 220 });
    const start = w.money;
    w.phase = 'wave';
    for (let i = 0; i < 11 * 60; i++) w.step(1 / 60);
    expect(w.money).toBeGreaterThan(start);
  });

  it('piekarz wave bonus and bank interest are paid at wave end', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    w.money = 100000;
    const t = w.placeTower('piekarz', { x: 300, y: 220 })!;
    w.upgradeTower(t, 1);
    w.upgradeTower(t, 1);
    w.money = 1000;
    w.startWave();
    // Kill everything instantly by skipping straight to the end of the spawn list.
    let guard = 0;
    while (w.phase === 'wave' && guard++ < 100000) {
      for (const e of w.enemies) e.alive = false;
      w.step(1 / 60);
    }
    expect(w.phase).toBe('idle');
    const end = w.drainEvents().find((e) => e.type === 'waveEnd');
    if (end?.type !== 'waveEnd') throw new Error('no waveEnd event');
    // Bonus = wave 102 + piekarz 80 + 5% interest of the money after those.
    const interestPaid = end.bonus - waveBonus(1) - 80;
    expect(interestPaid).toBeGreaterThan(0);
    expect(interestPaid).toBe(Math.min(300, Math.floor((w.money - interestPaid) * 0.05)));
  });
});
