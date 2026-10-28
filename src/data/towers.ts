import type { DamageType, TargetMode, TowerId } from '../core/types';

export type AttackKind = 'projectile' | 'hitscan' | 'trap' | 'pulse' | 'bomb' | 'chain' | 'income';

export interface SlowEffect {
  /** Speed multiplier while slowed (0.5 = half speed). */
  factor: number;
  duration: number;
}

export interface TowerStats {
  range: number;
  /** Seconds between attacks. */
  cooldown: number;
  damage: number;
  /** How many enemies one projectile / trap can hit. */
  pierce: number;
  damageType: DamageType;
  armorPierce: boolean;
  camoDetect: boolean;
  projectiles: number;
  /** Angle in radians between multiple projectiles. */
  spread: number;
  projectileSpeed: number;
  boomerang: boolean;
  splash: number;
  shrapnel: number;
  slow: SlowEffect | null;
  stun: number;
  chain: number;
  chainRange: number;
  maxTraps: number;
  trapLife: number;
  instakillSmall: boolean;
  auraCdMult: number;
  auraRange: number;
  tsunamiInterval: number;
  tsunamiDamage: number;
  cookieInterval: number;
  cookieValue: number;
  waveBonus: number;
  interestRate: number;
  interestCap: number;
}

export interface UpgradeDef {
  name: string;
  desc: string;
  cost: number;
  apply: (s: TowerStats) => void;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  desc: string;
  cost: number;
  kind: AttackKind;
  /** Footprint radius used for placement. */
  radius: number;
  defaultTarget: TargetMode;
  base: Partial<TowerStats>;
  pathNames: [string, string];
  paths: [UpgradeDef[], UpgradeDef[]];
}

export const BASE_STATS: TowerStats = {
  range: 120,
  cooldown: 1,
  damage: 1,
  pierce: 1,
  damageType: 'sharp',
  armorPierce: false,
  camoDetect: false,
  projectiles: 1,
  spread: 0,
  projectileSpeed: 500,
  boomerang: false,
  splash: 0,
  shrapnel: 0,
  slow: null,
  stun: 0,
  chain: 0,
  chainRange: 0,
  maxTraps: 0,
  trapLife: 0,
  instakillSmall: false,
  auraCdMult: 1,
  auraRange: 0,
  tsunamiInterval: 0,
  tsunamiDamage: 0,
  cookieInterval: 0,
  cookieValue: 0,
  waveBonus: 0,
  interestRate: 0,
  interestCap: 0,
};

const up = (name: string, desc: string, cost: number, apply: (s: TowerStats) => void): UpgradeDef => ({
  name,
  desc,
  cost,
  apply,
});

export const TOWERS: Record<TowerId, TowerDef> = {
  rzucacz: {
    id: 'rzucacz',
    name: 'Jamnik Rzucacz',
    desc: 'Rzuca kośćmi w najbliższe odkurzacze.',
    cost: 200,
    kind: 'projectile',
    radius: 16,
    defaultTarget: 'first',
    base: { range: 140, cooldown: 0.8, damage: 1, pierce: 2, projectileSpeed: 520 },
    pathNames: ['Kości', 'Rzut'],
    paths: [
      [
        up('Ostra kość', 'Kość przebija 3 odkurzacze.', 120, (s) => {
          s.pierce = 3;
        }),
        up('Kość z kolcami', 'Przebija 5 odkurzaczy, +15 zasięgu.', 260, (s) => {
          s.pierce = 5;
          s.range += 15;
        }),
        up('Kość-bumerang', 'Kość wraca do jamnika i trafia po drodze dwa razy.', 900, (s) => {
          s.boomerang = true;
          s.pierce = 8;
          s.damage = 2;
        }),
      ],
      [
        up('Szybszy rzut', 'Rzuca o 25% szybciej.', 150, (s) => {
          s.cooldown *= 0.75;
        }),
        up('Podwójna kość', 'Rzuca dwie kości naraz.', 300, (s) => {
          s.projectiles = 2;
          s.spread = 0.2;
        }),
        up('Kościana nawałnica', 'Pięć kości, szybciej i dalej.', 1400, (s) => {
          s.projectiles = 5;
          s.spread = 0.22;
          s.cooldown *= 0.6;
          s.range += 20;
        }),
      ],
    ],
  },
  snajper: {
    id: 'snajper',
    name: 'Jamnik Snajper',
    desc: 'Proca o ogromnym zasięgu. Ciężkie kości przebijają pancerz.',
    cost: 350,
    kind: 'hitscan',
    radius: 16,
    defaultTarget: 'strong',
    base: { range: 2000, cooldown: 1.8, damage: 2, damageType: 'blunt', armorPierce: true },
    pathNames: ['Precyzja', 'Szybkostrzelność'],
    paths: [
      [
        up('Gogle nocne', 'Wykrywa roboty-cienie.', 250, (s) => {
          s.camoDetect = true;
        }),
        up('Ciężka kość', 'Zadaje 5 obrażeń.', 600, (s) => {
          s.damage = 5;
        }),
        up('Kość-kafar', '12 obrażeń i ogłuszenie.', 2200, (s) => {
          s.damage = 12;
          s.stun = 0.6;
        }),
      ],
      [
        up('Szybsze przeładowanie', 'Strzela o 30% szybciej.', 300, (s) => {
          s.cooldown *= 0.7;
        }),
        up('Seria', 'Strzela dwa razy szybciej.', 800, (s) => {
          s.cooldown *= 0.5;
        }),
        up('Automatyczna proca', 'Ogień ciągły i +2 obrażeń.', 3000, (s) => {
          s.cooldown *= 0.35;
          s.damage += 2;
        }),
      ],
    ],
  },
  kopacz: {
    id: 'kopacz',
    name: 'Jamnik Kopacz',
    desc: 'Zakopuje kości-pułapki na ścieżce w swoim zasięgu.',
    cost: 300,
    kind: 'trap',
    radius: 16,
    defaultTarget: 'first',
    base: { range: 100, cooldown: 2.2, damage: 1, pierce: 6, maxTraps: 6, trapLife: 40 },
    pathNames: ['Pułapki', 'Doły'],
    paths: [
      [
        up('Więcej pułapek', 'Kopie szybciej, do 10 pułapek.', 200, (s) => {
          s.cooldown *= 0.7;
          s.maxTraps = 10;
        }),
        up('Kolczaste kopce', '2 obrażenia, 12 trafień.', 500, (s) => {
          s.pierce = 12;
          s.damage = 2;
        }),
        up('Kopalnia kości', 'Wybuchowe pułapki niszczą pancerz.', 1800, (s) => {
          s.damageType = 'explosive';
          s.armorPierce = true;
          s.damage = 5;
          s.pierce = 20;
          s.cooldown *= 0.6;
        }),
      ],
      [
        up('Pułapki-kleje', 'Pułapki spowalniają.', 250, (s) => {
          s.slow = { factor: 0.5, duration: 2 };
        }),
        up('Głębokie doły', 'Mocniejsze spowolnienie, +1 obrażeń.', 650, (s) => {
          s.slow = { factor: 0.35, duration: 3 };
          s.damage += 1;
        }),
        up('Zapadnia', 'Małe odkurzacze znikają w całości.', 2000, (s) => {
          s.instakillSmall = true;
          s.pierce = 30;
        }),
      ],
    ],
  },
  szczekacz: {
    id: 'szczekacz',
    name: 'Jamnik Szczekacz',
    desc: 'Szczeka falą dźwięku na wszystko wokół, także na cienie.',
    cost: 250,
    kind: 'pulse',
    radius: 16,
    defaultTarget: 'close',
    base: { range: 85, cooldown: 1.4, damage: 1, damageType: 'sound' },
    pathNames: ['Głośność', 'Strach'],
    paths: [
      [
        up('Głośniejsze szczekanie', '2 obrażenia.', 200, (s) => {
          s.damage = 2;
        }),
        up('Wycie', 'Zasięg 120.', 450, (s) => {
          s.range = 120;
        }),
        up('Szczek Grzmotu', '5 obrażeń, przebija pancerz.', 1600, (s) => {
          s.damage = 5;
          s.armorPierce = true;
          s.cooldown *= 0.8;
        }),
      ],
      [
        up('Strach', 'Spowalnia odkurzacze.', 200, (s) => {
          s.slow = { factor: 0.6, duration: 1.2 };
        }),
        up('Paraliż', 'Krótko ogłusza.', 500, (s) => {
          s.stun = 0.4;
        }),
        up('Psi chór', 'Jamniki w pobliżu atakują o 20% szybciej.', 1500, (s) => {
          s.auraCdMult = 0.8;
          s.auraRange = 150;
        }),
      ],
    ],
  },
  kucharz: {
    id: 'kucharz',
    name: 'Jamnik Kucharz',
    desc: 'Rzuca kośćmi-bombami. Wybuchy niszczą pancerz.',
    cost: 450,
    kind: 'bomb',
    radius: 16,
    defaultTarget: 'first',
    base: { range: 150, cooldown: 1.6, damage: 1, damageType: 'explosive', armorPierce: true, splash: 40, projectileSpeed: 380 },
    pathNames: ['Wybuch', 'Kuchnia'],
    paths: [
      [
        up('Większy wybuch', 'Promień wybuchu 55.', 300, (s) => {
          s.splash = 55;
        }),
        up('Szpikowy granat', '3 obrażenia.', 700, (s) => {
          s.damage = 3;
        }),
        up('Kocioł zagłady', '10 obrażeń, ogromny wybuch, ogłuszenie.', 2500, (s) => {
          s.damage = 10;
          s.splash = 80;
          s.stun = 0.3;
        }),
      ],
      [
        up('Szybsze gotowanie', 'Rzuca o 30% szybciej.', 350, (s) => {
          s.cooldown *= 0.7;
        }),
        up('Kości odłamkowe', 'Wybuch rozrzuca 8 odłamków.', 650, (s) => {
          s.shrapnel = 8;
        }),
        up('Bombardowanie', 'Trzy bomby naraz.', 2800, (s) => {
          s.projectiles = 3;
          s.spread = 0.35;
          s.cooldown *= 0.7;
        }),
      ],
    ],
  },
  strazak: {
    id: 'strazak',
    name: 'Jamnik Strażak',
    desc: 'Woda robi zwarcie, które przeskakuje na sąsiednie odkurzacze.',
    cost: 400,
    kind: 'chain',
    radius: 16,
    defaultTarget: 'first',
    base: { range: 130, cooldown: 1.3, damage: 1, damageType: 'water', armorPierce: true, chain: 3, chainRange: 70 },
    pathNames: ['Zwarcie', 'Strumień'],
    paths: [
      [
        up('Dłuższy łańcuch', 'Przeskakuje na 6 odkurzaczy.', 300, (s) => {
          s.chain = 6;
        }),
        up('Mokra podłoga', 'Trafione odkurzacze zwalniają.', 600, (s) => {
          s.slow = { factor: 0.6, duration: 1.5 };
        }),
        up('Burza z piorunami', '14 przeskoków, 3 obrażenia.', 2400, (s) => {
          s.chain = 14;
          s.damage = 3;
          s.chainRange = 100;
        }),
      ],
      [
        up('Mocniejszy strumień', '2 obrażenia.', 300, (s) => {
          s.damage = 2;
        }),
        up('Hydrant', 'Strzela o 40% szybciej.', 700, (s) => {
          s.cooldown *= 0.6;
        }),
        up('Tsunami', 'Co 10 s fala zalewa całą mapę.', 3200, (s) => {
          s.tsunamiInterval = 10;
          s.tsunamiDamage = 5;
        }),
      ],
    ],
  },
  piekarz: {
    id: 'piekarz',
    name: 'Jamnik Piekarz',
    desc: 'Nie walczy. Piecze psie ciasteczka, które dają pieniądze.',
    cost: 600,
    kind: 'income',
    radius: 16,
    defaultTarget: 'first',
    base: { range: 40, cooldown: 0, cookieInterval: 4, cookieValue: 12 },
    pathNames: ['Wypieki', 'Finanse'],
    paths: [
      [
        up('Większe wypieki', 'Ciasteczka po $18.', 400, (s) => {
          s.cookieValue = 18;
        }),
        up('Cukiernia', 'Piecze co 2,5 s.', 900, (s) => {
          s.cookieInterval = 2.5;
        }),
        up('Fabryka smakołyków', 'Ciasteczka po $40 co 1,5 s.', 3000, (s) => {
          s.cookieValue = 40;
          s.cookieInterval = 1.5;
        }),
      ],
      [
        up('Bonus za falę', '+$80 po każdej fali.', 300, (s) => {
          s.waveBonus = 80;
        }),
        up('Bank kości', '5% odsetek od gotówki po fali (max $300).', 1000, (s) => {
          s.interestRate = 0.05;
          s.interestCap = 300;
        }),
        up('Złota kość', '+$400 po fali i 10% odsetek (max $1000).', 3500, (s) => {
          s.waveBonus = 400;
          s.interestRate = 0.1;
          s.interestCap = 1000;
        }),
      ],
    ],
  },
};

export const TOWER_ORDER: TowerId[] = ['rzucacz', 'snajper', 'kopacz', 'szczekacz', 'kucharz', 'strazak', 'piekarz'];

export const MAX_LEVEL = 3;

/** Base stats with all purchased upgrades applied, in order. */
export function computeStats(def: TowerDef, levels: readonly [number, number]): TowerStats {
  const s: TowerStats = { ...BASE_STATS, ...def.base };
  if (s.slow) s.slow = { ...s.slow };
  for (let path = 0; path < 2; path++) {
    const ups = def.paths[path]!;
    for (let i = 0; i < levels[path]! && i < ups.length; i++) ups[i]!.apply(s);
  }
  return s;
}
