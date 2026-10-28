import type { MapId, Rect, Vec2 } from '../core/types';

export type DecorKind =
  | 'sofa'
  | 'armchair'
  | 'lamp'
  | 'plant'
  | 'tv'
  | 'bookshelf'
  | 'fridge'
  | 'counter'
  | 'stove'
  | 'table'
  | 'bowl'
  | 'tree'
  | 'bush'
  | 'doghouse'
  | 'pond'
  | 'flowers';

export interface Decoration extends Rect {
  kind: DecorKind;
}

export type MapTheme = 'salon' | 'kuchnia' | 'ogrod';

export interface MapDef {
  id: MapId;
  name: string;
  difficultyLabel: string;
  desc: string;
  theme: MapTheme;
  /** Waypoints in canvas px. Paths start and end just outside the field. */
  paths: Vec2[][];
  /** Width of the path in canvas px. */
  pathWidth: number;
  /** Decorations block tower placement. */
  decorations: Decoration[];
}

const p = (x: number, y: number): Vec2 => ({ x, y });
const d = (kind: DecorKind, x: number, y: number, w: number, h: number): Decoration => ({ kind, x, y, w, h });

export const MAPS: Record<MapId, MapDef> = {
  salon: {
    id: 'salon',
    name: 'Salon',
    difficultyLabel: 'Łatwa',
    desc: 'Długi, kręty chodnik po salonie. Dobry na początek.',
    theme: 'salon',
    pathWidth: 40,
    paths: [
      [
        p(-40, 96),
        p(224, 96),
        p(224, 288),
        p(96, 288),
        p(96, 512),
        p(416, 512),
        p(416, 160),
        p(608, 160),
        p(608, 416),
        p(800, 416),
        p(800, 96),
        p(896, 96),
        p(896, 576),
        p(1000, 576),
      ],
    ],
    decorations: [
      d('sofa', 420, 18, 160, 72),
      d('lamp', 320, 22, 32, 64),
      d('plant', 16, 14, 32, 44),
      d('plant', 920, 18, 32, 44),
      d('armchair', 668, 214, 80, 70),
      d('bookshelf', 600, 516, 144, 70),
      d('tv', 150, 560, 104, 64),
    ],
  },
  kuchnia: {
    id: 'kuchnia',
    name: 'Kuchnia',
    difficultyLabel: 'Średnia',
    desc: 'Krótka trasa, a meble zabierają miejsce na jamniki.',
    theme: 'kuchnia',
    pathWidth: 40,
    paths: [[p(-40, 224), p(192, 224), p(192, 480), p(448, 480), p(448, 128), p(704, 128), p(704, 416), p(864, 416), p(864, 680)]],
    decorations: [
      d('counter', 16, 16, 200, 72),
      d('stove', 300, 16, 88, 72),
      d('fridge', 864, 20, 72, 136),
      d('table', 236, 262, 168, 148),
      d('bowl', 40, 400, 48, 32),
      d('counter', 520, 548, 300, 80),
    ],
  },
  ogrod: {
    id: 'ogrod',
    name: 'Ogród',
    difficultyLabel: 'Trudna',
    desc: 'Odkurzacze wjeżdżają dwiema ścieżkami naraz.',
    theme: 'ogrod',
    pathWidth: 40,
    paths: [
      [
        p(-40, 80),
        p(224, 80),
        p(224, 208),
        p(64, 208),
        p(64, 336),
        p(416, 336),
        p(416, 80),
        p(608, 80),
        p(608, 336),
        p(800, 336),
        p(800, 80),
        p(1000, 80),
      ],
      [
        p(-40, 600),
        p(96, 600),
        p(96, 448),
        p(352, 448),
        p(352, 592),
        p(544, 592),
        p(544, 448),
        p(736, 448),
        p(736, 592),
        p(880, 592),
        p(880, 416),
        p(1000, 416),
      ],
    ],
    decorations: [
      d('pond', 256, 18, 128, 64),
      d('tree', 648, 120, 96, 116),
      d('tree', 850, 140, 96, 116),
      d('flowers', 150, 520, 96, 48),
      d('doghouse', 596, 500, 84, 92),
      d('bush', 904, 480, 48, 40),
      d('bush', 36, 380, 48, 40),
    ],
  },
};

export const MAP_ORDER: MapId[] = ['salon', 'kuchnia', 'ogrod'];
