import type { EnemyId } from '../core/types';
import type { WaveDef } from '../data/waves';

interface GroupState {
  enemy: EnemyId;
  remaining: number;
  interval: number;
  timer: number;
}

/** Releases the enemies of one wave over time. */
export class WaveSpawner {
  private readonly groups: GroupState[];
  private elapsed = 0;

  constructor(wave: WaveDef) {
    this.groups = wave.groups.map((g) => ({ enemy: g.enemy, remaining: g.count, interval: g.interval, timer: g.delay }));
  }

  get done(): boolean {
    return this.groups.every((g) => g.remaining <= 0);
  }

  get remaining(): number {
    return this.groups.reduce((sum, g) => sum + g.remaining, 0);
  }

  get time(): number {
    return this.elapsed;
  }

  /** Advance time and return the enemies to spawn this tick, in order. */
  update(dt: number): EnemyId[] {
    this.elapsed += dt;
    const out: EnemyId[] = [];
    for (const g of this.groups) {
      g.timer -= dt;
      while (g.remaining > 0 && g.timer <= 0) {
        out.push(g.enemy);
        g.remaining--;
        g.timer += g.interval;
      }
    }
    return out;
  }
}

export function waveEnemyCount(wave: WaveDef): number {
  return wave.groups.reduce((sum, g) => sum + g.count, 0);
}
