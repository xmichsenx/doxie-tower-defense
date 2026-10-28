import { describe, expect, it } from 'vitest';
import { Path } from '../src/core/path';

// An L-shaped path: 100 right, then 50 down.
const path = new Path([
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 50 },
]);

describe('Path', () => {
  it('rejects paths with fewer than two points', () => {
    expect(() => new Path([{ x: 0, y: 0 }])).toThrow();
  });

  it('measures its total length', () => {
    expect(path.length).toBe(150);
  });

  it('returns positions by distance', () => {
    expect(path.pointAt(0)).toEqual({ x: 0, y: 0 });
    expect(path.pointAt(50)).toEqual({ x: 50, y: 0 });
    expect(path.pointAt(100)).toEqual({ x: 100, y: 0 });
    expect(path.pointAt(125)).toEqual({ x: 100, y: 25 });
    expect(path.pointAt(150)).toEqual({ x: 100, y: 50 });
  });

  it('clamps positions outside the path', () => {
    expect(path.pointAt(-10)).toEqual({ x: 0, y: 0 });
    expect(path.pointAt(999)).toEqual({ x: 100, y: 50 });
  });

  it('gives the direction of travel on each segment', () => {
    expect(path.dirAt(10)).toEqual({ x: 1, y: 0 });
    expect(path.dirAt(120)).toEqual({ x: 0, y: 1 });
  });

  it('measures distance from a point to the path', () => {
    expect(path.distanceTo({ x: 50, y: 10 })).toBe(10);
    expect(path.distanceTo({ x: 110, y: 30 })).toBe(10);
  });

  it('samples evenly', () => {
    const s = path.sample(50);
    expect(s.map((p) => p.d)).toEqual([0, 50, 100, 150]);
  });
});
