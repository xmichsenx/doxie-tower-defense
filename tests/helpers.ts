import { Path } from '../src/core/path';
import type { EnemyFactory } from '../src/sim/enemy';

/** A straight 1000px path along y = 100. */
export const straightPath = (): Path =>
  new Path([
    { x: 0, y: 100 },
    { x: 1000, y: 100 },
  ]);

export function makeFactory(hpMult = 1, speedMult = 1): EnemyFactory {
  let uid = 1;
  return { nextUid: () => uid++, hpMult, speedMult };
}
