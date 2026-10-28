import { describe, expect, it } from 'vitest';
import { Path } from '../src/core/path';
import { MAPS } from '../src/data/maps';
import { placementProblem } from '../src/sim/placement';
import { GameWorld } from '../src/sim/world';

const map = MAPS.salon;
const paths = map.paths.map((p) => new Path(p));

describe('placement', () => {
  it('allows a free spot', () => {
    expect(placementProblem(map, paths, [], { x: 300, y: 220 }, 16)).toBeNull();
  });

  it('rejects spots on the path', () => {
    expect(placementProblem(map, paths, [], { x: 120, y: 96 }, 16)).toBe('path');
    expect(placementProblem(map, paths, [], { x: 224, y: 200 }, 16)).toBe('path');
  });

  it('rejects spots outside the field', () => {
    expect(placementProblem(map, paths, [], { x: 5, y: 300 }, 16)).toBe('bounds');
    expect(placementProblem(map, paths, [], { x: 500, y: 639 }, 16)).toBe('bounds');
  });

  it('rejects overlapping towers', () => {
    const towers = [{ pos: { x: 300, y: 220 }, radius: 16 }];
    expect(placementProblem(map, paths, towers, { x: 310, y: 225 }, 16)).toBe('tower');
    expect(placementProblem(map, paths, towers, { x: 340, y: 220 }, 16)).toBeNull();
  });

  it('rejects decorations', () => {
    const sofa = map.decorations.find((d) => d.kind === 'sofa')!;
    expect(placementProblem(map, paths, [], { x: sofa.x + sofa.w / 2, y: sofa.y + sofa.h / 2 }, 16)).toBe('decoration');
  });

  it('is enforced by the world, which also charges money', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    expect(w.placeTower('rzucacz', { x: 120, y: 96 })).toBeNull();
    const t = w.placeTower('rzucacz', { x: 300, y: 220 });
    expect(t).not.toBeNull();
    expect(w.money).toBe(650 - 200);
    expect(w.placeTower('rzucacz', { x: 305, y: 222 })).toBeNull();
  });

  it('refuses towers the player cannot afford', () => {
    const w = new GameWorld({ mapId: 'salon', difficulty: 'normal' });
    w.money = 100;
    expect(w.placeTower('rzucacz', { x: 300, y: 220 })).toBeNull();
    expect(w.towers).toHaveLength(0);
  });
});
