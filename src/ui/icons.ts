import type { TowerId } from '../core/types';
import { Assets, toCanvas, type Sprite } from '../render/assets';
import { GRID_PALETTE, PAL } from '../render/palette';
import { PixelCanvas } from '../render/pixel';

const ICONS: Record<string, string[]> = {
  heart: ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  coin: ['.yyyy.', 'yggggy', 'ygYYgy', 'ygYYgy', 'yggggy', '.yyyy.'],
  flag: ['k.....', 'kuuuu.', 'kuuuuu', 'kuuuu.', 'k.....', 'k.....'],
  bone: ['w.....w', 'wcccccw', 'w.....w'],
};

/** Scale a sprite into a standalone canvas for use in the DOM. */
export function spriteCanvas(s: Sprite, scale: number, cls = 'px-img'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = s.w * scale;
  c.height = s.h * scale;
  c.className = cls;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.canvas, 0, 0, c.width, c.height);
  return c;
}

export function icon(name: keyof typeof ICONS, scale = 3): HTMLCanvasElement {
  const rows = ICONS[name]!;
  const pc = new PixelCanvas(rows[0]!.length, rows.length);
  pc.grid(rows, GRID_PALETTE);
  const out = pc.outlined(PAL.outline);
  return spriteCanvas({ canvas: toCanvas(out), w: out.w, h: out.h }, scale, 'px-icon');
}

export function jamnikIcon(id: TowerId, scale = 2, tier = 0): HTMLCanvasElement {
  return spriteCanvas(Assets.jamnik(id, 'idle', tier, false, false), scale);
}
