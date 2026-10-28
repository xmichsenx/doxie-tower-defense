/**
 * A tiny pure-data pixel buffer. Sprites are painted into it in "art pixels"
 * and baked to canvases later, which keeps sprite code testable without a DOM.
 */
export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly px: (string | null)[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Array<string | null>(w * h).fill(null);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): string | null {
    return this.inside(x, y) ? this.px[y * this.w + x]! : null;
  }

  set(x: number, y: number, c: string | null): this {
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.inside(x, y)) this.px[y * this.w + x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  hline(x: number, y: number, w: number, c: string): this {
    return this.rect(x, y, w, 1, c);
  }

  vline(x: number, y: number, h: number, c: string): this {
    return this.rect(x, y, 1, h, c);
  }

  /** Filled ellipse centred on (cx, cy) using pixel centres. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  circle(cx: number, cy: number, r: number, c: string): this {
    return this.ellipse(cx, cy, r, r, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Paint rows of characters; '.' and ' ' are transparent. */
  grid(rows: readonly string[], palette: Readonly<Record<string, string>>, ox = 0, oy = 0): this {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]!;
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c) this.set(ox + x, oy + y, c);
      }
    });
    return this;
  }

  stamp(src: PixelCanvas, ox: number, oy: number): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c) this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }

  /** Copy grown by one pixel on each side with a 4-neighbour outline. */
  outlined(color: string): PixelCanvas {
    const out = new PixelCanvas(this.w + 2, this.h + 2);
    out.stamp(this, 1, 1);
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        if (out.get(x, y)) continue;
        const near =
          this.get(x - 2, y - 1) || this.get(x, y - 1) || this.get(x - 1, y - 2) || this.get(x - 1, y);
        if (near) out.set(x, y, color);
      }
    }
    return out;
  }

  flipped(): PixelCanvas {
    const out = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out.set(this.w - 1 - x, y, this.get(x, y));
    return out;
  }

  /** Replace one colour with another. */
  recolor(from: string, to: string): PixelCanvas {
    const out = new PixelCanvas(this.w, this.h);
    for (let i = 0; i < this.px.length; i++) out.px[i] = this.px[i] === from ? to : this.px[i]!;
    return out;
  }

  /** Every opaque pixel painted one colour (used for hit flashes and shadows). */
  silhouette(color: string): PixelCanvas {
    const out = new PixelCanvas(this.w, this.h);
    for (let i = 0; i < this.px.length; i++) out.px[i] = this.px[i] ? color : null;
    return out;
  }

  count(): number {
    return this.px.reduce((n, c) => (c ? n + 1 : n), 0);
  }
}
