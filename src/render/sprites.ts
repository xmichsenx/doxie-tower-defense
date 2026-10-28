import type { EnemyId, TowerId } from '../core/types';
import { GRID_PALETTE, PAL } from './palette';
import { PixelCanvas } from './pixel';

// ------------------------------------------------------------------ jamnik

/** Base dachshund, facing right. 'r' marks the collar, recoloured per tier. */
export const JAMNIK_BASE: readonly string[] = [
  '....................bbbb....',
  '...................bllllb...',
  '..................Dbblxbbb..',
  '.l...............DDbbbbbbbbn',
  '..l..............DDDbbbbbbb.',
  '..b.llllllllllllrDDDbbbb....',
  '...bbbbbbbbbbbbbrDDDbbb.....',
  '..bbbbbbbbbbbbbbrbDD........',
  '..bbbbbbbbbbbbbbbbbb........',
  '..DbbbbbbbbbbbbbbbbD........',
  '...DPPPPPPPPPPPPPD..........',
  '...bD.bD.......bD.bD........',
  '...DD.DD.......DD.DD........',
];

export type JamnikFrame = 'idle' | 'wag' | 'throw';
export const JAMNIK_FRAMES: JamnikFrame[] = ['idle', 'wag', 'throw'];

function replaceAt(row: string, x: number, s: string): string {
  return row.slice(0, x) + s + row.slice(x + s.length);
}

export function jamnikRows(frame: JamnikFrame): string[] {
  const rows = [...JAMNIK_BASE];
  if (frame === 'wag') {
    rows[3] = replaceAt(rows[3]!, 0, 'l.');
    rows[4] = replaceAt(rows[4]!, 0, '.l.');
  }
  if (frame === 'throw') {
    // Open mouth with tongue, tail straight up.
    rows[6] = replaceAt(rows[6]!, 20, 'tt');
    rows[3] = replaceAt(rows[3]!, 0, '..');
    rows[4] = replaceAt(rows[4]!, 0, '..b');
    rows[2] = replaceAt(rows[2]!, 0, '..l');
  }
  return rows;
}

export interface Overlay {
  rows: readonly string[];
  /** Offset relative to the base dachshund's top-left corner. */
  ox: number;
  oy: number;
}

/** Headgear and props that tell the jamniki apart. */
export const ACCESSORIES: Record<TowerId, Overlay[]> = {
  rzucacz: [{ rows: ['.....', '.....'], ox: 0, oy: 0 }],
  snajper: [
    { rows: ['..VVVV...', 'VVVVVVVVV'], ox: 18, oy: -1 },
    { rows: ['8.8', '8.8', '.8.', '.8.'], ox: 23, oy: 7 },
  ],
  kopacz: [{ rows: ['...yyy..', '.yyyyyyw', 'YYYYYYYY'], ox: 18, oy: -2 }],
  szczekacz: [{ rows: ['rrrr', '.rr.'], ox: 14, oy: 7 }],
  kucharz: [{ rows: ['..www..', '.wwwww.', '.wwwww.', '..222..'], ox: 17, oy: -4 }],
  strazak: [{ rows: ['..rrrr...', '.rrryrr..', 'RRRRRRRRR'], ox: 18, oy: -2 }],
  piekarz: [{ rows: ['..ccc..', '.ccccc.', 'YYYYYYY'], ox: 18, oy: -2 }],
};

/** Shown only after certain upgrades. */
export const GOGGLES: Overlay = { rows: ['Uqq'], ox: 20, oy: 2 };
export const MOUTH_BONE: Overlay = { rows: ['c...c', 'cwwwc'], ox: 22, oy: 5 };

export const TIER_COLLAR = [PAL.red, PAL.blue, PAL.purple, PAL.gold] as const;

const JAMNIK_W = 30;
const JAMNIK_H = 18;
const BASE_X = 1;
const BASE_Y = 4;

/** Dachshund sprite (outlined, facing right). */
export function buildJamnik(id: TowerId, frame: JamnikFrame, tier: number, opts: { goggles?: boolean } = {}): PixelCanvas {
  let pc = new PixelCanvas(JAMNIK_W, JAMNIK_H);
  pc.grid(jamnikRows(frame), GRID_PALETTE, BASE_X, BASE_Y);
  pc = pc.recolor(PAL.red, TIER_COLLAR[Math.max(0, Math.min(3, tier))]!);
  for (const o of ACCESSORIES[id]) pc.grid(o.rows, GRID_PALETTE, BASE_X + o.ox, BASE_Y + o.oy);
  if (id === 'rzucacz' && frame !== 'throw') pc.grid(MOUTH_BONE.rows, GRID_PALETTE, BASE_X + MOUTH_BONE.ox, BASE_Y + MOUTH_BONE.oy);
  if (opts.goggles) pc.grid(GOGGLES.rows, GRID_PALETTE, BASE_X + GOGGLES.ox, BASE_Y + GOGGLES.oy);
  return pc.outlined(PAL.outline);
}

// ---------------------------------------------------------------- vacuums

function angryEye(pc: PixelCanvas, x: number, y: number, iris: string = PAL.black): void {
  pc.rect(x, y, 3, 2, PAL.white);
  pc.set(x + 2, y + 1, iris);
  pc.set(x + 1, y + 1, iris);
  pc.hline(x, y - 1, 2, PAL.black);
  pc.set(x + 2, y, PAL.black);
}

function wheel(pc: PixelCanvas, cx: number, cy: number, r: number, frame: number): void {
  pc.circle(cx, cy, r, PAL.grey5);
  pc.set(Math.floor(cx) + (frame ? 0 : -1), Math.floor(cy) - (frame ? 1 : 0), PAL.grey3);
}

function vacReczny(f: number): PixelCanvas {
  const pc = new PixelCanvas(17, 11);
  pc.rect(3, 1, 7, 1, PAL.grey4).rect(3, 1, 1, 3, PAL.grey4).rect(9, 1, 1, 3, PAL.grey4);
  pc.ellipse(7, 6.5, 6, 3.5, PAL.yellow);
  pc.hline(3, 9, 8, PAL.yellowDark).hline(2, 8, 10, PAL.yellowDark);
  pc.hline(4, 4, 5, PAL.gold);
  pc.rect(12, 6, 5, 2, PAL.grey3).rect(15, 5, 2, 4, PAL.grey4);
  angryEye(pc, 7, 5);
  if (f) pc.set(1, 9, PAL.grey2);
  return pc.outlined(PAL.outline);
}

function vacWorkowy(f: number): PixelCanvas {
  const pc = new PixelCanvas(21, 15);
  // hose
  pc.line(9, 3, 13, 1, PAL.grey4).line(13, 1, 17, 3, PAL.grey4).line(17, 3, 19, 8, PAL.grey4).rect(18, 8, 3, 3, PAL.grey3);
  pc.ellipse(8.5, 8, 7.5, 5, PAL.red);
  pc.ellipse(8, 6.5, 5.5, 2.5, '#e2566a');
  pc.hline(3, 11, 11, PAL.redDark).hline(4, 12, 9, PAL.redDark);
  pc.rect(7, 2, 3, 2, PAL.grey3);
  angryEye(pc, 10, 7);
  wheel(pc, 4, 13, 1.6, f);
  wheel(pc, 13, 13, 1.6, f);
  return pc.outlined(PAL.outline);
}

function vacRobot(f: number, body: string = PAL.grey2, top: string = PAL.grey1, eye: string = PAL.green): PixelCanvas {
  const pc = new PixelCanvas(18, 9);
  pc.ellipse(9, 4.5, 8.5, 3.5, body);
  pc.ellipse(9, 3, 6.5, 1.8, top);
  pc.hline(2, 6, 14, PAL.grey4).hline(4, 7, 10, PAL.grey5);
  pc.rect(8, 1, 2, 1, eye);
  pc.rect(11, 4, 5, 2, PAL.black);
  pc.set(12, 4, eye).set(14, 4, eye);
  pc.set(f ? 1 : 16, 7, PAL.grey3);
  return pc.outlined(PAL.outline);
}

function vacPionowy(f: number): PixelCanvas {
  const pc = new PixelCanvas(16, 24);
  // handle
  pc.rect(5, 0, 5, 2, PAL.grey5).vline(7, 2, 5, PAL.grey4).vline(8, 2, 5, PAL.grey3);
  // bag
  pc.rect(4, 6, 8, 12, PAL.blue).rect(5, 7, 2, 10, '#6a92e6').rect(10, 7, 2, 11, PAL.blueDark);
  pc.hline(4, 6, 8, PAL.blueDark);
  angryEye(pc, 7, 10);
  pc.rect(6, 14, 4, 1, PAL.black);
  // floor head
  pc.rect(1, 18, 14, 4, PAL.grey3).hline(1, 18, 14, PAL.grey2).hline(1, 21, 14, PAL.grey5);
  pc.rect(12, 19, 3, 2, PAL.yellow);
  wheel(pc, 3, 22, 1.6, f);
  wheel(pc, 12, 22, 1.6, f);
  return pc.outlined(PAL.outline);
}

function vacPrzemyslowy(f: number): PixelCanvas {
  const pc = new PixelCanvas(26, 21);
  pc.line(12, 2, 18, 0, PAL.grey5).line(18, 0, 23, 3, PAL.grey5).line(23, 3, 24, 12, PAL.grey5).rect(22, 12, 4, 4, PAL.grey4);
  pc.rect(2, 3, 19, 15, PAL.grey3);
  pc.rect(3, 4, 4, 13, PAL.grey2).rect(17, 4, 3, 13, PAL.grey4);
  pc.rect(1, 2, 21, 2, PAL.grey4).hline(2, 2, 19, PAL.grey2);
  // hazard stripes
  for (let x = 2; x < 21; x++) {
    const c = Math.floor((x + (f ? 1 : 0)) / 2) % 2 === 0 ? PAL.yellow : PAL.black;
    pc.set(x, 13, c).set(x, 14, c);
  }
  for (const [x, y] of [
    [4, 6],
    [18, 6],
    [4, 11],
    [18, 11],
  ] as const)
    pc.set(x, y, PAL.grey5);
  angryEye(pc, 9, 7, PAL.red);
  angryEye(pc, 14, 7, PAL.red);
  pc.hline(10, 11, 6, PAL.grey5);
  wheel(pc, 5, 19, 2, f);
  wheel(pc, 11, 19, 2, f);
  wheel(pc, 17, 19, 2, f);
  return pc.outlined(PAL.outline);
}

function vacParowy(f: number): PixelCanvas {
  const pc = new PixelCanvas(21, 19);
  // steam
  const puffY = f ? 0 : 1;
  pc.circle(6, 2 + puffY, 2, PAL.grey1).circle(9, 1 + (1 - puffY), 1.5, PAL.white);
  pc.rect(6, 5, 3, 3, PAL.grey3);
  pc.ellipse(9, 11, 8.5, 5.5, PAL.white);
  pc.ellipse(9, 13, 8.5, 3.5, PAL.teal);
  pc.hline(2, 15, 14, '#2e7c78');
  pc.line(16, 9, 19, 12, PAL.grey4).rect(18, 12, 3, 3, PAL.grey3);
  angryEye(pc, 10, 9);
  wheel(pc, 4, 17, 1.6, f);
  wheel(pc, 14, 17, 1.6, f);
  return pc.outlined(PAL.outline);
}

function vacMegassak(f: number): PixelCanvas {
  const pc = new PixelCanvas(46, 36);
  // siren
  pc.rect(19, 0, 6, 4, f ? PAL.red : '#ff7a6a').rect(18, 4, 8, 2, PAL.grey4);
  // exhaust
  pc.rect(4, 2, 4, 8, PAL.grey4).rect(3, 1, 6, 2, PAL.grey5);
  if (f) pc.circle(5, 0, 1.5, PAL.grey3);
  // body
  pc.rect(2, 6, 40, 24, PAL.grey4);
  pc.rect(3, 7, 38, 4, PAL.grey3).rect(3, 26, 38, 3, PAL.grey5);
  pc.rect(2, 6, 3, 24, PAL.grey3);
  for (let x = 4; x < 42; x += 5) pc.set(x, 8, PAL.grey2).set(x, 27, PAL.grey2);
  // red armour band
  pc.rect(2, 12, 40, 3, PAL.redDark).hline(2, 12, 40, PAL.red);
  // eyes
  pc.rect(24, 16, 6, 4, PAL.yellow).rect(33, 16, 6, 4, PAL.yellow);
  pc.rect(27, 17, 3, 3, PAL.black).rect(36, 17, 3, 3, PAL.black);
  pc.line(23, 14, 30, 16, PAL.black).line(40, 14, 33, 16, PAL.black);
  // intake mouth with teeth
  pc.rect(36, 21, 10, 8, PAL.black);
  for (let y = 21; y < 29; y += 2) pc.set(36, y, PAL.white).set(45, y + 1, PAL.white);
  pc.rect(22, 22, 12, 4, PAL.black);
  for (let x = 22; x < 34; x += 2) pc.set(x, 22, PAL.white).set(x + 1, 25, PAL.white);
  // spikes
  for (let x = 8; x < 40; x += 6) pc.set(x, 5, PAL.grey2).set(x + 1, 5, PAL.grey2).set(x, 4, PAL.grey1);
  wheel(pc, 7, 32, 3, f);
  wheel(pc, 18, 32, 3, f);
  wheel(pc, 29, 32, 3, f);
  wheel(pc, 39, 32, 3, f);
  return pc.outlined(PAL.outline);
}

export const VACUUM_BUILDERS: Record<EnemyId, (frame: number) => PixelCanvas> = {
  reczny: vacReczny,
  workowy: vacWorkowy,
  robot: (f) => vacRobot(f),
  pionowy: vacPionowy,
  cien: (f) => vacRobot(f, PAL.purpleDark, PAL.purple, PAL.red),
  przemyslowy: vacPrzemyslowy,
  parowy: vacParowy,
  megassak: vacMegassak,
};

export function buildVacuum(id: EnemyId, frame: number): PixelCanvas {
  return VACUUM_BUILDERS[id](frame % 2);
}

// ------------------------------------------------------------- small items

export const BONE_FRAMES: readonly (readonly string[])[] = [
  ['w.....w', 'wcccccw', 'w.....w'],
  ['ww.....', 'wcc....', '..cc...', '...cc..', '....ccw', '.....ww'],
  ['w.w', '.c.', '.c.', '.c.', '.c.', 'w.w'],
  ['.....ww', '....ccw', '...cc..', '..cc...', 'wcc....', 'ww.....'],
];

export function buildBone(frame: number): PixelCanvas {
  const rows = BONE_FRAMES[((frame % 4) + 4) % 4]!;
  const pc = new PixelCanvas(rows[0]!.length, rows.length);
  pc.grid(rows, GRID_PALETTE);
  return pc.outlined(PAL.outline);
}

export function buildBomb(frame: number): PixelCanvas {
  const pc = new PixelCanvas(9, 10);
  pc.circle(4, 5.5, 4, PAL.grey5);
  pc.set(2, 3, PAL.grey3).set(3, 3, PAL.grey3).set(2, 4, PAL.grey4);
  pc.hline(2, 6, 5, PAL.cream).set(2, 5, PAL.cream).set(2, 7, PAL.cream).set(6, 5, PAL.cream).set(6, 7, PAL.cream);
  pc.set(6, 1, PAL.wood3).set(7, 0, frame % 2 ? PAL.yellow : PAL.orange);
  return pc.outlined(PAL.outline);
}

export const COOKIE_ROWS: readonly string[] = ['.66...66.', '667666766', '.6787876.', '677777776', '.77...77.'];

export function buildCookie(): PixelCanvas {
  const pc = new PixelCanvas(9, 5);
  pc.grid(COOKIE_ROWS, GRID_PALETTE);
  return pc.outlined(PAL.wood4);
}

export function buildTrap(variant: 'bone' | 'glue' | 'mine'): PixelCanvas {
  const pc = new PixelCanvas(13, 8);
  if (variant === 'glue') pc.ellipse(6.5, 5, 6.5, 3, PAL.green).ellipse(5, 4.5, 3, 1.2, '#8fd27a');
  else pc.ellipse(6.5, 5.5, 6, 2.5, PAL.wood4).ellipse(6.5, 5, 5, 1.6, PAL.wood3);
  if (variant === 'mine') {
    pc.rect(5, 2, 3, 3, PAL.grey4).set(6, 1, PAL.red);
  } else {
    pc.set(2, 2, PAL.white).set(2, 4, PAL.white).hline(3, 3, 5, PAL.cream).set(8, 2, PAL.white).set(8, 4, PAL.white);
    pc.set(9, 3, PAL.grey2).set(10, 2, PAL.grey2).set(4, 1, PAL.grey2);
  }
  return pc.outlined(PAL.outline);
}

/** Every hand-drawn grid, for validation in tests. */
export function allGrids(): { name: string; rows: readonly string[] }[] {
  const out: { name: string; rows: readonly string[] }[] = [];
  for (const f of JAMNIK_FRAMES) out.push({ name: `jamnik:${f}`, rows: jamnikRows(f) });
  for (const [id, list] of Object.entries(ACCESSORIES)) list.forEach((o, i) => out.push({ name: `acc:${id}:${i}`, rows: o.rows }));
  out.push({ name: 'goggles', rows: GOGGLES.rows }, { name: 'mouthBone', rows: MOUTH_BONE.rows });
  BONE_FRAMES.forEach((rows, i) => out.push({ name: `bone:${i}`, rows }));
  out.push({ name: 'cookie', rows: COOKIE_ROWS });
  return out;
}
