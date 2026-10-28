import { describe, expect, it } from 'vitest';
import { circleRect, clamp, dist, distToSegment, normalize } from '../src/core/math';
import { Rng } from '../src/core/rng';

describe('math', () => {
  it('measures distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('normalizes vectors and handles zero length', () => {
    const n = normalize({ x: 10, y: 0 });
    expect(n).toEqual({ x: 1, y: 0 });
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('computes point-to-segment distance', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distToSegment({ x: 5, y: 3 }, a, b)).toBe(3);
    expect(distToSegment({ x: -4, y: 3 }, a, b)).toBe(5);
    expect(distToSegment({ x: 13, y: 4 }, a, b)).toBe(5);
    expect(distToSegment({ x: 1, y: 1 }, a, a)).toBeCloseTo(Math.SQRT2);
  });

  it('detects circle–rectangle overlap', () => {
    const r = { x: 0, y: 0, w: 10, h: 10 };
    expect(circleRect({ x: 5, y: 5 }, 1, r)).toBe(true);
    expect(circleRect({ x: 13, y: 5 }, 4, r)).toBe(true);
    expect(circleRect({ x: 15, y: 5 }, 4, r)).toBe(false);
  });
});

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(new Rng(43).next()).not.toBe(seqA[0]);
  });

  it('stays within ranges', () => {
    const r = new Rng(1);
    for (let i = 0; i < 200; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(2, 4);
      expect([2, 3, 4]).toContain(n);
    }
    expect(() => r.pick([])).toThrow();
  });
});
