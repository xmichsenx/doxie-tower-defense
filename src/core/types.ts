export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type EnemyId =
  | 'reczny'
  | 'workowy'
  | 'robot'
  | 'pionowy'
  | 'cien'
  | 'przemyslowy'
  | 'parowy'
  | 'megassak';

export type TowerId = 'rzucacz' | 'snajper' | 'kopacz' | 'szczekacz' | 'kucharz' | 'strazak' | 'piekarz';

export type TargetMode = 'first' | 'last' | 'strong' | 'close';

export type DamageType = 'sharp' | 'blunt' | 'explosive' | 'water' | 'sound';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type MapId = 'salon' | 'kuchnia' | 'ogrod';

/** Logical size of the play field in canvas pixels. Pixel art is drawn at ART_SCALE. */
export const FIELD_W = 960;
export const FIELD_H = 640;
export const ART_SCALE = 2;

/** Fixed simulation step. */
export const SIM_DT = 1 / 60;
