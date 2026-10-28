import type { EnemyId } from '../core/types';

export interface EnemyChild {
  id: EnemyId;
  count: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  desc: string;
  hp: number;
  /** Multiplier of ENEMY_SPEED_UNIT. */
  speed: number;
  /** Collision radius in canvas px. */
  radius: number;
  reward: number;
  armored: boolean;
  camo: boolean;
  waterImmune: boolean;
  boss: boolean;
  children: EnemyChild[];
}

/** Canvas px per second at speed 1.0. */
export const ENEMY_SPEED_UNIT = 64;

function def(d: Partial<EnemyDef> & Pick<EnemyDef, 'id' | 'name' | 'desc' | 'hp' | 'speed' | 'radius' | 'reward'>): EnemyDef {
  return { armored: false, camo: false, waterImmune: false, boss: false, children: [], ...d };
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  reczny: def({ id: 'reczny', name: 'Odkurzacz ręczny', desc: 'Mały i słaby.', hp: 1, speed: 1.0, radius: 9, reward: 1 }),
  workowy: def({
    id: 'workowy',
    name: 'Odkurzacz workowy',
    desc: 'Po zniszczeniu wypada z niego ręczny.',
    hp: 3,
    speed: 0.9,
    radius: 11,
    reward: 2,
    children: [{ id: 'reczny', count: 1 }],
  }),
  robot: def({ id: 'robot', name: 'Robot sprzątający', desc: 'Bardzo szybki.', hp: 2, speed: 1.9, radius: 9, reward: 2 }),
  pionowy: def({
    id: 'pionowy',
    name: 'Odkurzacz pionowy',
    desc: 'Rozpada się na dwa workowe.',
    hp: 6,
    speed: 1.1,
    radius: 12,
    reward: 4,
    children: [{ id: 'workowy', count: 2 }],
  }),
  cien: def({
    id: 'cien',
    name: 'Robot-cień',
    desc: 'Kamuflaż: widzą go tylko jamniki z wykrywaniem.',
    hp: 4,
    speed: 1.6,
    radius: 9,
    reward: 4,
    camo: true,
    children: [{ id: 'robot', count: 2 }],
  }),
  przemyslowy: def({
    id: 'przemyslowy',
    name: 'Odkurzacz przemysłowy',
    desc: 'Pancerz: zwykłe kości i szczekanie się odbijają.',
    hp: 20,
    speed: 0.8,
    radius: 16,
    reward: 10,
    armored: true,
    children: [{ id: 'pionowy', count: 3 }],
  }),
  parowy: def({
    id: 'parowy',
    name: 'Odkurzacz parowy',
    desc: 'Odporny na wodę.',
    hp: 12,
    speed: 1.2,
    radius: 13,
    reward: 8,
    waterImmune: true,
    children: [{ id: 'pionowy', count: 2 }],
  }),
  megassak: def({
    id: 'megassak',
    name: 'MEGA SSAK',
    desc: 'Boss. Opancerzony, odporny na ogłuszenie.',
    hp: 400,
    speed: 0.45,
    radius: 30,
    reward: 150,
    armored: true,
    boss: true,
    children: [{ id: 'przemyslowy', count: 4 }],
  }),
};

export const ENEMY_ORDER: EnemyId[] = ['reczny', 'workowy', 'robot', 'pionowy', 'cien', 'przemyslowy', 'parowy', 'megassak'];

/** Lives lost when an undamaged enemy of this type reaches the end (its HP plus everything inside it). */
export function defLeakValue(id: EnemyId): number {
  const d = ENEMIES[id];
  return d.hp + d.children.reduce((sum, c) => sum + c.count * defLeakValue(c.id), 0);
}

/** Money earned by destroying the enemy and every child inside it. */
export function familyReward(id: EnemyId): number {
  const d = ENEMIES[id];
  return d.reward + d.children.reduce((sum, c) => sum + c.count * familyReward(c.id), 0);
}
