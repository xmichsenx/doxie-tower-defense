import { describe, expect, it } from 'vitest';
import { ENEMY_ORDER } from '../src/data/enemies';
import { MAPS, MAP_ORDER } from '../src/data/maps';
import { TOWER_ORDER } from '../src/data/towers';
import { DECOR_KINDS, buildBackground, buildDecoration, shade } from '../src/render/background';
import { FONT, glyph, textWidth } from '../src/render/font';
import { GRID_PALETTE, PAL } from '../src/render/palette';
import { PixelCanvas } from '../src/render/pixel';
import {
  ACCESSORIES,
  JAMNIK_FRAMES,
  TIER_COLLAR,
  allGrids,
  buildBomb,
  buildBone,
  buildCookie,
  buildJamnik,
  buildTrap,
  buildVacuum,
} from '../src/render/sprites';

describe('grid sprites', () => {
  for (const { name, rows } of allGrids()) {
    it(`${name}: rows have equal width and only palette characters`, () => {
      const w = rows[0]!.length;
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(w);
        for (const ch of row) expect(ch === '.' || ch in GRID_PALETTE, `${name} char '${ch}'`).toBe(true);
      });
    });
  }
});

describe('sprite builders', () => {
  it('every tower has accessories and builds in every frame and tier', () => {
    for (const id of TOWER_ORDER) {
      expect(ACCESSORIES[id]).toBeDefined();
      for (const f of JAMNIK_FRAMES) {
        for (let tier = 0; tier <= 3; tier++) {
          const pc = buildJamnik(id, f, tier);
          expect(pc.count()).toBeGreaterThan(150);
        }
      }
    }
  });

  it('tier changes the collar colour', () => {
    const has = (pc: PixelCanvas, c: string) => pc.px.includes(c);
    expect(has(buildJamnik('rzucacz', 'idle', 0), TIER_COLLAR[0])).toBe(true);
    expect(has(buildJamnik('rzucacz', 'idle', 3), TIER_COLLAR[3])).toBe(true);
    expect(has(buildJamnik('rzucacz', 'idle', 3), TIER_COLLAR[0])).toBe(false);
  });

  it('every vacuum has two distinct animation frames', () => {
    for (const id of ENEMY_ORDER) {
      const a = buildVacuum(id, 0);
      const b = buildVacuum(id, 1);
      expect(a.count(), id).toBeGreaterThan(40);
      expect(a.px, id).not.toEqual(b.px);
    }
  });

  it('builds small items', () => {
    for (let f = 0; f < 4; f++) expect(buildBone(f).count()).toBeGreaterThan(8);
    expect(buildBomb(0).count()).toBeGreaterThan(20);
    expect(buildCookie().count()).toBeGreaterThan(15);
    for (const v of ['bone', 'glue', 'mine'] as const) expect(buildTrap(v).count()).toBeGreaterThan(20);
  });

  it('builds every decoration and map background', () => {
    for (const kind of DECOR_KINDS) expect(buildDecoration({ kind, w: 80, h: 64 }).count(), kind).toBeGreaterThan(50);
    for (const id of MAP_ORDER) {
      const bg = buildBackground(MAPS[id]);
      expect(bg.w).toBe(480);
      expect(bg.h).toBe(320);
      expect(bg.count()).toBe(480 * 320);
    }
  });
});

describe('PixelCanvas', () => {
  it('outlines, flips and recolours', () => {
    const pc = new PixelCanvas(3, 1).set(0, 0, PAL.red);
    const o = pc.outlined(PAL.outline);
    expect(o.w).toBe(5);
    expect(o.get(1, 1)).toBe(PAL.red);
    expect(o.get(0, 1)).toBe(PAL.outline);
    expect(o.get(2, 1)).toBe(PAL.outline);
    expect(o.get(0, 0)).toBeNull();
    expect(pc.flipped().get(2, 0)).toBe(PAL.red);
    expect(pc.recolor(PAL.red, PAL.blue).get(0, 0)).toBe(PAL.blue);
    expect(pc.silhouette(PAL.white).get(0, 0)).toBe(PAL.white);
  });

  it('ignores out-of-bounds writes', () => {
    const pc = new PixelCanvas(2, 2).set(-1, 0, PAL.red).set(5, 5, PAL.red);
    expect(pc.count()).toBe(0);
  });

  it('shades colours', () => {
    expect(shade('#808080', 0.5)).toBe('#404040');
    expect(shade('#ffffff', 2)).toBe('#ffffff');
  });
});

describe('pixel font', () => {
  it('glyphs have 5 equal-width rows', () => {
    for (const [ch, def] of Object.entries(FONT)) {
      const rows = def.split('|');
      expect(rows, ch).toHaveLength(5);
      for (const r of rows) expect(r.length, ch).toBe(rows[0]!.length);
    }
  });

  it('measures text and falls back for unknown characters', () => {
    expect(textWidth('1')).toBe(3);
    expect(textWidth('11')).toBe(7);
    expect(glyph('ą').w).toBe(glyph(' ').w);
    expect(glyph('a')).toEqual(glyph('A'));
  });
});
