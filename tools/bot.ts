/**
 * Greedy balance bot: buys jamniki on the best-covered spots following a fixed
 * shopping list, then plays waves until it loses or wins. Used for tuning.
 *
 * In the dev server console: `(await import('/tools/bot.ts')).runBot('salon', 'normal')`
 */
import type { Difficulty, MapId, TowerId, Vec2 } from '../src/core/types';
import { GameWorld } from '../src/sim/world';

const PLAN = [
  'rzucacz',
  'rzucacz',
  'rzucacz:1',
  'rzucacz',
  'szczekacz',
  'rzucacz:0',
  'kucharz',
  'snajper',
  'snajper:0',
  'strazak',
  'rzucacz:1',
  'kucharz:1',
  'piekarz',
  'snajper',
  'kucharz:0',
  'strazak:0',
  'szczekacz:0',
  'kucharz',
  'strazak:1',
  'rzucacz:0',
  'kucharz:0',
  'snajper:1',
  'strazak:0',
  'kucharz:1',
  'snajper:0',
  'rzucacz',
  'kucharz',
  'strazak',
  'piekarz:0',
  'kucharz:0',
  'strazak:1',
];

export interface BotResult {
  map: MapId;
  diff: Difficulty;
  wave: number;
  phase: string;
  lives: number;
  log: string[];
  world: GameWorld;
}

export function runBot(mapId: MapId, diff: Difficulty, seed = 1, maxWave = 40, verbose = false): BotResult {
  const w = new GameWorld({ mapId, difficulty: diff, seed });
  // Coverage of each path per candidate spot.
  const spots: { p: Vec2; cov: number[] }[] = [];
  for (let x = 24; x < 940; x += 16) {
    for (let y = 24; y < 620; y += 16) {
      const p = { x, y };
      if (w.placementProblem('rzucacz', p)) continue;
      const cov = w.paths.map((path) => path.sample(10).filter((s) => Math.hypot(s.p.x - x, s.p.y - y) < 130).length);
      spots.push({ p, cov });
    }
  }
  const total = (s: { cov: number[] }) => s.cov.reduce((a, b) => a + b, 0);

  let step = 0;
  let placed = 0;
  const act = () => {
    while (step < PLAN.length * 4) {
      const [id, pathS] = PLAN[step % PLAN.length]!.split(':') as [TowerId, string | undefined];
      if (pathS === undefined) {
        if (w.money < w.towerPrice(id)) return;
        // Prefer spots covering every path, then the path whose turn it is, then total coverage.
        const target = placed % w.paths.length;
        const score = (s: { cov: number[] }) => Math.min(...s.cov) * 2 + s.cov[target]! + total(s);
        const free = spots.filter((c) => !w.placementProblem(id, c.p));
        free.sort((a, b) => score(b) - score(a));
        if (free[0]) {
          w.placeTower(id, free[0].p);
          placed++;
        }
        step++;
      } else {
        const path = Number(pathS) as 0 | 1;
        const ts = w.towers.filter((t) => t.def.id === id && w.upgradePrice(t, path) !== null);
        if (!ts.length) {
          step++;
          continue;
        }
        ts.sort((a, b) => w.upgradePrice(a, path)! - w.upgradePrice(b, path)!);
        if (w.money < w.upgradePrice(ts[0]!, path)!) return;
        w.upgradeTower(ts[0]!, path);
        step++;
      }
    }
  };

  const log: string[] = [];
  while (w.phase !== 'lost' && w.phase !== 'won' && w.wave < maxWave) {
    act();
    w.startWave();
    let g = 0;
    while (w.phase === 'wave' && g++ < 60 * 400) {
      w.step(1 / 60);
      if (g % 60 === 0) act();
    }
    const phase: string = w.phase;
    if (verbose || w.wave % 5 === 0 || phase === 'lost') log.push(`w${w.wave}: lives ${w.lives} $${w.money} towers ${w.towers.length}`);
  }
  return { map: mapId, diff, wave: w.wave, phase: w.phase, lives: w.lives, log, world: w };
}
