import { distToSegment } from '../core/math';
import { ART_SCALE, FIELD_H, FIELD_W } from '../core/types';
import type { Decoration, DecorKind, MapDef } from '../data/maps';
import { PAL } from './palette';
import { PixelCanvas } from './pixel';

const shadeCache = new Map<string, string>();

/** Multiply a #rrggbb colour's brightness. */
export function shade(hex: string, f: number): string {
  const key = hex + f;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const out = '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
  shadeCache.set(key, out);
  return out;
}

/** Deterministic hash noise in [0, 1). */
export function hash(x: number, y: number, seed = 0): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

type FloorFn = (x: number, y: number) => string;

const floors: Record<MapDef['theme'], FloorFn> = {
  salon: (x, y) => {
    const row = Math.floor(y / 8);
    const offset = (row * 23) % 48;
    const plank = Math.floor((x + offset) / 48);
    if (y % 8 === 0) return PAL.wood3;
    if ((x + offset) % 48 === 0) return PAL.wood3;
    const base = hash(plank, row) < 0.5 ? PAL.wood1 : '#cf9058';
    const n = hash(x, y);
    if (n < 0.04) return PAL.wood2;
    if (y % 8 === 1) return shade(base, 1.06);
    return base;
  },
  kuchnia: (x, y) => {
    if (x % 16 === 0 || y % 16 === 0) return '#c9c2b0';
    const dark = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
    const base = dark ? '#8fc4c0' : '#f1ead6';
    if (x % 16 === 1 || y % 16 === 1) return shade(base, 1.05);
    if (hash(x, y) < 0.03) return shade(base, 0.95);
    return base;
  },
  ogrod: (x, y) => {
    const n = hash(x, y);
    const big = hash(Math.floor(x / 6), Math.floor(y / 6), 3);
    if (n < 0.006) return PAL.white;
    if (n < 0.011) return PAL.yellow;
    if (n < 0.014) return PAL.pink;
    let c: string = big < 0.35 ? '#4f9e45' : big < 0.75 ? PAL.green : '#66b856';
    if (n > 0.9) c = PAL.greenDark;
    else if (n > 0.82 && (x + y) % 2 === 0) c = shade(c, 0.9);
    return c;
  },
};

type PathFn = (x: number, y: number, d: number, half: number) => string;

const pathStyles: Record<MapDef['theme'], PathFn> = {
  salon: (x, y, d, half) => {
    if (d > half - 1.5) return PAL.redDark;
    if (d > half - 3) return PAL.gold;
    if (d > half - 4) return PAL.redDark;
    const pattern = (x + y) % 8 === 0 || (x - y + 800) % 8 === 0;
    return pattern ? '#d4505c' : '#b8303f';
  },
  kuchnia: (x, y, d, half) => {
    if (d > half - 1.5) return PAL.grey5;
    if (x % 8 === 0 || y % 8 === 0) return PAL.grey4;
    const dark = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
    const base = dark ? '#6c7486' : '#7d8597';
    return hash(x, y) < 0.05 ? shade(base, 1.1) : base;
  },
  ogrod: (x, y, d, half) => {
    const n = hash(x, y, 7);
    if (d > half - 1.5) return n < 0.5 ? '#6f8f3a' : '#7a5a34';
    if (n < 0.03) return PAL.grey2;
    if (n < 0.05) return PAL.grey3;
    return n < 0.45 ? '#9a6d42' : n < 0.85 ? '#a67848' : '#8a5f3a';
  },
};

// ---------------------------------------------------------- decorations

type Painter = (pc: PixelCanvas, w: number, h: number) => void;

const painters: Record<DecorKind, Painter> = {
  sofa: (pc, w, h) => {
    const back = '#3d7f8c';
    const seat = '#58a0ad';
    pc.rect(2, 0, w - 4, Math.floor(h * 0.5), back);
    pc.hline(3, 1, w - 6, shade(back, 1.2));
    pc.rect(2, Math.floor(h * 0.45), w - 4, Math.floor(h * 0.4), seat);
    const cw = Math.floor((w - 12) / 3);
    for (let i = 1; i < 3; i++) pc.vline(6 + cw * i, Math.floor(h * 0.45), Math.floor(h * 0.4), shade(seat, 0.8));
    pc.rect(0, 4, 6, h - 8, shade(back, 0.85)).rect(w - 6, 4, 6, h - 8, shade(back, 0.85));
    pc.hline(0, 4, 6, shade(back, 1.15)).hline(w - 6, 4, 6, shade(back, 1.15));
    pc.rect(2, h - 4, 3, 4, PAL.wood4).rect(w - 5, h - 4, 3, 4, PAL.wood4);
    pc.rect(12, Math.floor(h * 0.2), 8, 7, PAL.yellow).rect(w - 20, Math.floor(h * 0.2), 8, 7, PAL.pink);
  },
  armchair: (pc, w, h) => {
    const c = '#c9962e';
    pc.rect(3, 0, w - 6, Math.floor(h * 0.55), c).hline(4, 1, w - 8, shade(c, 1.2));
    pc.rect(3, Math.floor(h * 0.5), w - 6, Math.floor(h * 0.35), shade(c, 1.1));
    pc.rect(0, 5, 5, h - 9, shade(c, 0.8)).rect(w - 5, 5, 5, h - 9, shade(c, 0.8));
    pc.rect(3, h - 4, 3, 4, PAL.wood4).rect(w - 6, h - 4, 3, 4, PAL.wood4);
  },
  lamp: (pc, w, h) => {
    const mid = Math.floor(w / 2);
    for (let y = 0; y < 10; y++) pc.hline(mid - 3 - Math.floor(y / 2), y, 6 + Math.floor(y / 2) * 2, y === 9 ? '#d9b97a' : PAL.cream);
    pc.vline(mid - 1, 10, h - 14, PAL.grey4).vline(mid, 10, h - 14, PAL.grey3);
    pc.ellipse(mid, h - 2.5, 5, 2.5, PAL.grey4);
    pc.hline(mid - 2, 1, 3, PAL.white);
  },
  plant: (pc, w, h) => {
    const mid = w / 2;
    pc.ellipse(mid, 7, 7, 6, PAL.greenDark).ellipse(mid - 3, 5, 3.5, 4, PAL.green).ellipse(mid + 3, 8, 3.5, 3, PAL.green);
    pc.ellipse(mid, 3, 3, 3, '#7cc56a');
    pc.rect(Math.floor(mid) - 5, h - 9, 10, 9, '#c8643a').hline(Math.floor(mid) - 6, h - 9, 12, '#e07a4a');
    pc.hline(Math.floor(mid) - 5, h - 2, 10, '#9a4a2a');
  },
  tv: (pc, w, h) => {
    pc.rect(0, Math.floor(h * 0.55), w, Math.floor(h * 0.45), PAL.wood3).hline(0, Math.floor(h * 0.55), w, PAL.wood2);
    pc.rect(4, Math.floor(h * 0.7), Math.floor(w / 2) - 6, 5, PAL.wood4).rect(Math.floor(w / 2) + 2, Math.floor(h * 0.7), Math.floor(w / 2) - 6, 5, PAL.wood4);
    pc.rect(6, 0, w - 12, Math.floor(h * 0.5), PAL.grey5).rect(8, 2, w - 16, Math.floor(h * 0.5) - 4, '#1e2a44');
    pc.line(10, 4, 16, 2, '#4a6aa8').line(11, 7, 20, 3, '#36508a');
    pc.rect(Math.floor(w / 2) - 2, Math.floor(h * 0.5), 4, 2, PAL.grey4);
  },
  bookshelf: (pc, w, h) => {
    pc.rect(0, 0, w, h, PAL.wood3).rect(2, 2, w - 4, h - 4, PAL.wood4);
    const colors = [PAL.red, PAL.blue, PAL.green, PAL.yellow, PAL.purple, PAL.cream, PAL.orange, PAL.teal];
    const shelves = 3;
    const sh = Math.floor((h - 4) / shelves);
    for (let s = 0; s < shelves; s++) {
      const y0 = 2 + s * sh;
      pc.hline(0, y0 + sh - 1, w, PAL.wood2);
      let x = 3;
      let i = s * 3;
      while (x < w - 5) {
        const bw = 2 + Math.floor(hash(x, s) * 3);
        const bh = sh - 3 - Math.floor(hash(s, x) * 3);
        pc.rect(x, y0 + sh - 1 - bh, bw, bh, colors[i % colors.length]!);
        pc.vline(x, y0 + sh - 1 - bh, bh, shade(colors[i % colors.length]!, 1.2));
        x += bw + (hash(x, x) < 0.2 ? 2 : 0);
        i++;
      }
    }
  },
  fridge: (pc, w, h) => {
    pc.rect(0, 0, w, h, PAL.grey1).rect(w - 3, 0, 3, h, PAL.grey2);
    pc.hline(0, Math.floor(h * 0.35), w, PAL.grey3);
    pc.rect(3, 6, 2, 10, PAL.grey3).rect(3, Math.floor(h * 0.35) + 5, 2, 14, PAL.grey3);
    pc.rect(12, 6, 5, 4, PAL.red).rect(22, 9, 4, 5, PAL.yellow).rect(15, 30, 6, 4, PAL.blue);
    pc.rect(2, h - 3, 4, 3, PAL.grey4).rect(w - 6, h - 3, 4, 3, PAL.grey4);
  },
  counter: (pc, w, h) => {
    pc.rect(0, 0, w, 6, PAL.wood1).hline(0, 0, w, shade(PAL.wood1, 1.15)).hline(0, 5, w, PAL.wood3);
    pc.rect(0, 6, w, h - 6, '#e8dfc8');
    const doors = Math.max(2, Math.floor(w / 24));
    const dw = Math.floor(w / doors);
    for (let i = 0; i < doors; i++) {
      pc.rect(i * dw + 2, 9, dw - 4, h - 12, '#d8ccb0');
      pc.rect(i * dw + Math.floor(dw / 2) - 1, 14, 2, 4, PAL.grey3);
    }
    pc.rect(Math.floor(w * 0.6), 1, 14, 4, PAL.grey2).rect(Math.floor(w * 0.6) + 1, 2, 12, 2, PAL.grey3);
    pc.rect(6, 1, 8, 4, PAL.red).hline(5, 1, 10, PAL.redDark);
  },
  stove: (pc, w, h) => {
    pc.rect(0, 0, w, h, PAL.grey2).rect(0, 0, w, 14, PAL.grey4);
    for (const [cx, cy] of [
      [w * 0.27, 4],
      [w * 0.73, 4],
      [w * 0.27, 10],
      [w * 0.73, 10],
    ] as const)
      pc.circle(cx, cy, 2.5, PAL.black).set(Math.floor(cx), Math.floor(cy), PAL.red);
    pc.rect(4, 18, w - 8, h - 22, PAL.grey3).rect(6, 20, w - 12, h - 26, '#2a2f3a').hline(6, 17, w - 12, PAL.grey1);
  },
  table: (pc, w, h) => {
    const chair = PAL.wood3;
    pc.rect(Math.floor(w / 2) - 12, 0, 8, 7, chair).rect(Math.floor(w / 2) + 4, 0, 8, 7, chair);
    pc.rect(Math.floor(w / 2) - 12, h - 7, 8, 7, chair).rect(Math.floor(w / 2) + 4, h - 7, 8, 7, chair);
    pc.rect(0, Math.floor(h / 2) - 5, 6, 10, chair).rect(w - 6, Math.floor(h / 2) - 5, 6, 10, chair);
    pc.rect(5, 5, w - 10, h - 10, PAL.wood2).rect(6, 6, w - 12, h - 12, PAL.wood1);
    pc.rect(12, 12, w - 24, h - 24, '#f2eee6');
    for (let x = 12; x < w - 12; x += 4) for (let y = 12; y < h - 12; y += 4) if ((x + y) % 8 === 0) pc.rect(x, y, 2, 2, '#e0626e');
    pc.circle(w * 0.35, h * 0.45, 4, PAL.white).circle(w * 0.35, h * 0.45, 2, PAL.orange);
    pc.circle(w * 0.66, h * 0.55, 3, PAL.blue).circle(w * 0.66, h * 0.55, 1.5, PAL.wood4);
  },
  bowl: (pc, w, h) => {
    pc.ellipse(w / 2, h / 2 + 1, w / 2, h / 2 - 1, PAL.red);
    pc.ellipse(w / 2, h / 2 - 1, w / 2 - 3, h / 2 - 4, PAL.redDark);
    for (let i = 0; i < 12; i++) pc.set(5 + Math.floor(hash(i, 1) * (w - 10)), 4 + Math.floor(hash(1, i) * 4), PAL.wood3);
    pc.hline(Math.floor(w / 2) - 3, h - 4, 6, PAL.white);
  },
  tree: (pc, w, h) => {
    pc.rect(Math.floor(w / 2) - 4, h - 22, 8, 22, PAL.wood3).vline(Math.floor(w / 2) - 4, h - 22, 22, PAL.wood2);
    pc.ellipse(w / 2, h * 0.38, w / 2, h * 0.36, PAL.greenDeep);
    pc.ellipse(w / 2 - 6, h * 0.32, w / 3, h * 0.26, PAL.greenDark);
    pc.ellipse(w / 2 + 7, h * 0.4, w / 3.2, h * 0.24, PAL.greenDark);
    pc.ellipse(w / 2 - 4, h * 0.25, w / 5, h * 0.14, PAL.green);
    for (let i = 0; i < 7; i++) pc.rect(8 + Math.floor(hash(i, 4) * (w - 16)), 6 + Math.floor(hash(4, i) * h * 0.5), 2, 2, PAL.red);
  },
  bush: (pc, w, h) => {
    pc.ellipse(w * 0.3, h * 0.6, w * 0.3, h * 0.4, PAL.greenDark);
    pc.ellipse(w * 0.7, h * 0.6, w * 0.3, h * 0.4, PAL.greenDark);
    pc.ellipse(w * 0.5, h * 0.42, w * 0.32, h * 0.4, PAL.green);
    pc.ellipse(w * 0.45, h * 0.3, w * 0.14, h * 0.14, '#7cc56a');
    pc.set(Math.floor(w * 0.3), Math.floor(h * 0.5), PAL.pink).set(Math.floor(w * 0.7), Math.floor(h * 0.4), PAL.white);
  },
  pond: (pc, w, h) => {
    pc.ellipse(w / 2, h / 2, w / 2, h / 2, PAL.grey3);
    pc.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, '#3f8fd0');
    pc.ellipse(w / 2, h / 2 + 2, w / 2 - 6, h / 2 - 6, '#3274b8');
    pc.hline(Math.floor(w * 0.3), Math.floor(h * 0.3), 8, '#8ed0f4').hline(Math.floor(w * 0.55), Math.floor(h * 0.6), 6, '#8ed0f4');
    pc.ellipse(w * 0.7, h * 0.35, 4, 2.5, PAL.green).ellipse(w * 0.25, h * 0.62, 3.5, 2, PAL.green);
    pc.set(Math.floor(w * 0.7), Math.floor(h * 0.33), PAL.pink);
  },
  flowers: (pc, w, h) => {
    pc.rect(0, 2, w, h - 2, PAL.wood4).rect(1, 3, w - 2, h - 4, '#6a4430');
    const colors = [PAL.red, PAL.yellow, PAL.pink, PAL.white, PAL.purple];
    for (let x = 3; x < w - 3; x += 5) {
      for (let y = 5; y < h - 3; y += 6) {
        const c = colors[Math.floor(hash(x, y) * colors.length)]!;
        const ox = x + (y % 12 === 5 ? 2 : 0);
        pc.set(ox, y + 1, PAL.green).set(ox, y + 2, PAL.greenDark);
        pc.set(ox - 1, y, c).set(ox + 1, y, c).set(ox, y - 1, c).set(ox, y + 1 - 1, PAL.yellow);
      }
    }
  },
  doghouse: (pc, w, h) => {
    const roofH = Math.floor(h * 0.42);
    for (let y = 0; y < roofH; y++) {
      const half = Math.floor(((y + 1) / roofH) * (w / 2));
      pc.hline(Math.floor(w / 2) - half, y, half * 2, y % 3 === 0 ? PAL.redDark : PAL.red);
    }
    pc.rect(3, roofH, w - 6, h - roofH, PAL.wood2);
    for (let y = roofH + 3; y < h; y += 4) pc.hline(3, y, w - 6, PAL.wood3);
    pc.ellipse(w / 2, h - 7, 7, 9, PAL.black);
    pc.rect(Math.floor(w / 2) - 7, h - 7, 14, 7, PAL.black);
    pc.rect(Math.floor(w / 2) - 6, roofH + 2, 12, 5, PAL.cream);
    pc.set(Math.floor(w / 2) - 5, roofH + 3, PAL.wood3).set(Math.floor(w / 2) + 4, roofH + 5, PAL.wood3);
    pc.hline(Math.floor(w / 2) - 4, roofH + 4, 8, PAL.wood3);
  },
};

export function buildDecoration(d: Pick<Decoration, 'kind' | 'w' | 'h'>): PixelCanvas {
  const w = Math.round(d.w / ART_SCALE);
  const h = Math.round(d.h / ART_SCALE);
  const pc = new PixelCanvas(w, h);
  painters[d.kind](pc, w, h);
  return pc.outlined(PAL.outline);
}

export const DECOR_KINDS = Object.keys(painters) as DecorKind[];

/** Full map background in art pixels: floor, path, shadows and decorations. */
export function buildBackground(map: MapDef): PixelCanvas {
  const W = FIELD_W / ART_SCALE;
  const H = FIELD_H / ART_SCALE;
  const pc = new PixelCanvas(W, H);
  const floor = floors[map.theme];
  const pathStyle = pathStyles[map.theme];
  const half = map.pathWidth / 2 / ART_SCALE;
  const segs: [number, number, number, number][] = [];
  for (const pts of map.paths) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      segs.push([a.x / ART_SCALE, a.y / ART_SCALE, b.x / ART_SCALE, b.y / ART_SCALE]);
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };
      let d = Infinity;
      for (const [ax, ay, bx, by] of segs) d = Math.min(d, distToSegment(p, { x: ax, y: ay }, { x: bx, y: by }));
      let c: string;
      if (d < half) c = pathStyle(x, y, d, half);
      else {
        c = floor(x, y);
        // Soft shadow along the path edge.
        if (d < half + 2) c = shade(c, 0.78);
        else if (d < half + 3) c = shade(c, 0.9);
      }
      // Gentle vignette.
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge < 6) c = shade(c, 0.86 + edge * 0.023);
      pc.set(x, y, c);
    }
  }

  for (const d of map.decorations) {
    const dx = Math.round(d.x / ART_SCALE);
    const dy = Math.round(d.y / ART_SCALE);
    const w = Math.round(d.w / ART_SCALE);
    const h = Math.round(d.h / ART_SCALE);
    // Shadow under the decoration.
    for (let y = dy + h - 4; y < dy + h + 3; y++) {
      for (let x = dx - 1; x < dx + w + 3; x++) {
        const c = pc.get(x, y);
        if (c) pc.set(x, y, shade(c, 0.8));
      }
    }
    pc.stamp(buildDecoration(d), dx - 1, dy - 1);
  }
  return pc;
}
