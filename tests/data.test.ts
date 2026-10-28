import { describe, expect, it } from 'vitest';
import { Path } from '../src/core/path';
import { FIELD_H, FIELD_W, type EnemyId } from '../src/core/types';
import { ENEMIES, ENEMY_ORDER } from '../src/data/enemies';
import { MAPS, MAP_ORDER } from '../src/data/maps';
import { TOWERS, TOWER_ORDER, computeStats } from '../src/data/towers';
import { WAVES } from '../src/data/waves';

describe('enemy data', () => {
  it('lists every enemy once with matching ids', () => {
    expect(new Set(ENEMY_ORDER).size).toBe(Object.keys(ENEMIES).length);
    for (const id of ENEMY_ORDER) expect(ENEMIES[id].id).toBe(id);
  });

  it('has no cycles in children', () => {
    const visit = (id: EnemyId, seen: Set<EnemyId>): void => {
      expect(seen.has(id), `cycle through ${id}`).toBe(false);
      for (const c of ENEMIES[id].children) visit(c.id, new Set([...seen, id]));
    };
    for (const id of ENEMY_ORDER) visit(id, new Set());
  });

  it('has positive stats', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.hp).toBeGreaterThan(0);
      expect(e.speed).toBeGreaterThan(0);
      expect(e.radius).toBeGreaterThan(0);
      expect(e.reward).toBeGreaterThan(0);
    }
  });
});

describe('wave data', () => {
  it('references only existing enemies with sane timings', () => {
    for (const [i, w] of WAVES.entries()) {
      expect(w.groups.length, `wave ${i + 1}`).toBeGreaterThan(0);
      for (const g of w.groups) {
        expect(ENEMIES[g.enemy], `wave ${i + 1}`).toBeDefined();
        expect(g.count).toBeGreaterThan(0);
        expect(g.interval).toBeGreaterThan(0);
        expect(g.delay).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('introduces camo and armor only after detection is affordable', () => {
    const first = (id: EnemyId) => WAVES.findIndex((w) => w.groups.some((g) => g.enemy === id)) + 1;
    expect(first('cien')).toBeGreaterThanOrEqual(10);
    expect(first('przemyslowy')).toBeGreaterThanOrEqual(15);
    expect(first('megassak')).toBeGreaterThanOrEqual(30);
  });
});

describe('map data', () => {
  it('every map has paths with 2+ waypoints that start and end off-screen', () => {
    for (const id of MAP_ORDER) {
      const m = MAPS[id];
      expect(m.id).toBe(id);
      expect(m.paths.length).toBeGreaterThan(0);
      for (const pts of m.paths) {
        expect(pts.length).toBeGreaterThanOrEqual(2);
        const inside = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x <= FIELD_W && p.y <= FIELD_H;
        expect(inside(pts[0]!)).toBe(false);
        expect(inside(pts[pts.length - 1]!)).toBe(false);
        for (const p of pts.slice(1, -1)) expect(inside(p)).toBe(true);
      }
    }
  });

  it('decorations stay inside the field and off the paths', () => {
    for (const id of MAP_ORDER) {
      const m = MAPS[id];
      const paths = m.paths.map((p) => new Path(p));
      for (const d of m.decorations) {
        expect(d.x >= 0 && d.y >= 0 && d.x + d.w <= FIELD_W && d.y + d.h <= FIELD_H, `${id}:${d.kind}`).toBe(true);
        const corners = [
          { x: d.x, y: d.y },
          { x: d.x + d.w, y: d.y },
          { x: d.x, y: d.y + d.h },
          { x: d.x + d.w, y: d.y + d.h },
          { x: d.x + d.w / 2, y: d.y + d.h / 2 },
        ];
        for (const c of corners) {
          for (const p of paths) expect(p.distanceTo(c), `${id}:${d.kind}`).toBeGreaterThan(m.pathWidth / 2);
        }
      }
    }
  });

  it('has enough room to place towers', () => {
    for (const id of MAP_ORDER) {
      const m = MAPS[id];
      const paths = m.paths.map((p) => new Path(p));
      let free = 0;
      for (let x = 20; x < FIELD_W; x += 40) {
        for (let y = 20; y < FIELD_H; y += 40) {
          if (paths.every((p) => p.distanceTo({ x, y }) > m.pathWidth / 2 + 16)) free++;
        }
      }
      expect(free, id).toBeGreaterThan(100);
    }
  });
});

describe('tower data', () => {
  it('every tower has 2 paths × 3 upgrades with positive costs', () => {
    expect(TOWER_ORDER).toHaveLength(7);
    for (const id of TOWER_ORDER) {
      const t = TOWERS[id];
      expect(t.id).toBe(id);
      expect(t.cost).toBeGreaterThan(0);
      expect(t.paths).toHaveLength(2);
      for (const path of t.paths) {
        expect(path).toHaveLength(3);
        for (const u of path) {
          expect(u.cost).toBeGreaterThan(0);
          expect(u.name.length).toBeGreaterThan(0);
          expect(u.desc.length).toBeGreaterThan(0);
        }
        // Later upgrades cost more.
        expect(path[0]!.cost).toBeLessThan(path[2]!.cost);
      }
    }
  });

  it('every upgrade actually changes the stats', () => {
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      for (const path of [0, 1] as const) {
        for (let lvl = 1; lvl <= 3; lvl++) {
          const before: [number, number] = path === 0 ? [lvl - 1, 0] : [0, lvl - 1];
          const after: [number, number] = path === 0 ? [lvl, 0] : [0, lvl];
          expect(computeStats(def, after), `${id} path ${path} lvl ${lvl}`).not.toEqual(computeStats(def, before));
        }
      }
    }
  });

  it('there is a camo answer and an armor answer', () => {
    const all = TOWER_ORDER.flatMap((id) => [computeStats(TOWERS[id], [3, 1]), computeStats(TOWERS[id], [1, 3])]);
    expect(all.some((s) => s.camoDetect)).toBe(true);
    expect(TOWER_ORDER.some((id) => computeStats(TOWERS[id], [0, 0]).armorPierce)).toBe(true);
  });
});
