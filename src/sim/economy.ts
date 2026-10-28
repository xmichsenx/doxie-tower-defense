import type { Difficulty } from '../core/types';

export const START_MONEY = 650;
export const SELL_RATIO = 0.7;

export interface DifficultyDef {
  name: string;
  lives: number;
  priceMult: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { name: 'Łatwa', lives: 200, priceMult: 0.85 },
  normal: { name: 'Normalna', lives: 100, priceMult: 1 },
  hard: { name: 'Trudna', lives: 50, priceMult: 1.08 },
};

/** Price adjusted for difficulty, rounded to $5. */
export function priceFor(base: number, difficulty: Difficulty): number {
  return Math.max(5, Math.round((base * DIFFICULTIES[difficulty].priceMult) / 5) * 5);
}

export function waveBonus(wave: number): number {
  return 100 + 2 * wave;
}

export function sellValue(spent: number): number {
  return Math.floor(spent * SELL_RATIO);
}

export function interest(money: number, rate: number, cap: number): number {
  if (rate <= 0) return 0;
  return Math.min(cap, Math.floor(money * rate));
}
