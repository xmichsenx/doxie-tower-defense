/** 3×5 pixel font for in-canvas text ('#' = ink). Rows are separated by '|'. */
export const FONT: Readonly<Record<string, string>> = {
  '0': '###|#.#|#.#|#.#|###',
  '1': '.#.|##.|.#.|.#.|###',
  '2': '##.|..#|.#.|#..|###',
  '3': '##.|..#|.#.|..#|##.',
  '4': '#.#|#.#|###|..#|..#',
  '5': '###|#..|##.|..#|##.',
  '6': '.##|#..|###|#.#|###',
  '7': '###|..#|.#.|.#.|.#.',
  '8': '###|#.#|###|#.#|###',
  '9': '###|#.#|###|..#|##.',
  A: '.#.|#.#|###|#.#|#.#',
  B: '##.|#.#|##.|#.#|##.',
  C: '.##|#..|#..|#..|.##',
  D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###',
  F: '###|#..|##.|#..|#..',
  G: '.##|#..|#.#|#.#|.##',
  H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###',
  J: '..#|..#|..#|#.#|.#.',
  K: '#.#|#.#|##.|#.#|#.#',
  L: '#..|#..|#..|#..|###',
  M: '#...#|##.##|#.#.#|#...#|#...#',
  N: '#..#|##.#|#.##|#..#|#..#',
  O: '.#.|#.#|#.#|#.#|.#.',
  P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##',
  R: '##.|#.#|##.|#.#|#.#',
  S: '.##|#..|.#.|..#|##.',
  T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###',
  V: '#.#|#.#|#.#|#.#|.#.',
  W: '#...#|#...#|#.#.#|##.##|#...#',
  X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.',
  Z: '###|..#|.#.|#..|###',
  '+': '...|.#.|###|.#.|...',
  '-': '...|...|###|...|...',
  $: '.##|##.|.#.|.##|##.',
  '!': '.#.|.#.|.#.|...|.#.',
  ':': '...|.#.|...|.#.|...',
  '/': '..#|..#|.#.|#..|#..',
  '.': '...|...|...|...|.#.',
  ' ': '..|..|..|..|..',
};

export interface Glyph {
  w: number;
  rows: string[];
}

export function glyph(ch: string): Glyph {
  const def = FONT[ch.toUpperCase()] ?? FONT[' ']!;
  const rows = def.split('|');
  return { w: rows[0]!.length, rows };
}

/** Width of text in font pixels (1px spacing between glyphs). */
export function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += glyph(ch).w + 1;
  return Math.max(0, w - 1);
}

/** Draw text with its top-left at (x, y); `size` is screen pixels per font pixel. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  shadow?: string,
): void {
  const pass = (ox: number, oy: number, c: string) => {
    ctx.fillStyle = c;
    let cx = x + ox;
    for (const ch of text) {
      const g = glyph(ch);
      g.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === '#') ctx.fillRect(cx + rx * size, y + oy + ry * size, size, size);
        }
      });
      cx += (g.w + 1) * size;
    }
  };
  if (shadow) pass(size, size, shadow);
  pass(0, 0, color);
}

export function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  size: number,
  color: string,
  shadow?: string,
): void {
  drawText(ctx, text, Math.round(cx - (textWidth(text) * size) / 2), y, size, color, shadow);
}
