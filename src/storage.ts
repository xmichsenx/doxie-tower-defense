import type { Difficulty, MapId } from './core/types';

const PREFIX = 'jamniki:';

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Storage unavailable (private mode etc.) – not critical.
  }
}

export function getBestWave(map: MapId, diff: Difficulty): number {
  return Number(read(`best:${map}:${diff}`) ?? 0) || 0;
}

export function recordWave(map: MapId, diff: Difficulty, wave: number): boolean {
  if (wave <= getBestWave(map, diff)) return false;
  write(`best:${map}:${diff}`, String(wave));
  return true;
}

export function getSetting(name: string, fallback: boolean): boolean {
  const v = read(`set:${name}`);
  return v === null ? fallback : v === '1';
}

export function setSetting(name: string, value: boolean): void {
  write(`set:${name}`, value ? '1' : '0');
}

export function getStringSetting(name: string): string | null {
  return read(`set:${name}`);
}

export function setStringSetting(name: string, value: string): void {
  write(`set:${name}`, value);
}
