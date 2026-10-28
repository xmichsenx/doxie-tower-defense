import type { EnemyId, TowerId } from '../core/types';
import type { MapDef } from '../data/maps';
import { buildBackground } from './background';
import { PAL } from './palette';
import type { PixelCanvas } from './pixel';
import { buildBomb, buildBone, buildCookie, buildJamnik, buildTrap, buildVacuum, type JamnikFrame } from './sprites';

/** Bake a pixel buffer into a canvas at 1 art pixel = 1 canvas pixel. */
export function toCanvas(pc: PixelCanvas): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = pc.w;
  c.height = pc.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(pc.w, pc.h);
  for (let i = 0; i < pc.px.length; i++) {
    const col = pc.px[i];
    if (!col) continue;
    const n = parseInt(col.slice(1), 16);
    img.data[i * 4] = (n >> 16) & 255;
    img.data[i * 4 + 1] = (n >> 8) & 255;
    img.data[i * 4 + 2] = n & 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

const cache = new Map<string, Sprite>();

function cached(key: string, make: () => PixelCanvas): Sprite {
  let s = cache.get(key);
  if (!s) {
    const pc = make();
    s = { canvas: toCanvas(pc), w: pc.w, h: pc.h };
    cache.set(key, s);
  }
  return s;
}

export const Assets = {
  jamnik(id: TowerId, frame: JamnikFrame, tier: number, flip: boolean, goggles: boolean): Sprite {
    return cached(`j:${id}:${frame}:${tier}:${flip}:${goggles}`, () => {
      const pc = buildJamnik(id, frame, tier, { goggles });
      return flip ? pc.flipped() : pc;
    });
  },
  vacuum(id: EnemyId, frame: number, flip: boolean): Sprite {
    return cached(`v:${id}:${frame}:${flip}`, () => {
      const pc = buildVacuum(id, frame);
      return flip ? pc.flipped() : pc;
    });
  },
  vacuumFlash(id: EnemyId, frame: number, flip: boolean): Sprite {
    return cached(`vf:${id}:${frame}:${flip}`, () => {
      const pc = buildVacuum(id, frame).silhouette(PAL.white);
      return flip ? pc.flipped() : pc;
    });
  },
  bone(frame: number): Sprite {
    return cached(`b:${frame}`, () => buildBone(frame));
  },
  bomb(frame: number): Sprite {
    return cached(`bomb:${frame}`, () => buildBomb(frame));
  },
  cookie(): Sprite {
    return cached('cookie', buildCookie);
  },
  trap(variant: 'bone' | 'glue' | 'mine'): Sprite {
    return cached(`trap:${variant}`, () => buildTrap(variant));
  },
  background(map: MapDef): Sprite {
    return cached(`bg:${map.id}`, () => buildBackground(map));
  },
};
