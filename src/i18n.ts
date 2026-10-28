import type { Difficulty, EnemyId, MapId, TargetMode, TowerId } from './core/types';
import { ENEMIES } from './data/enemies';
import { MAPS } from './data/maps';
import { TOWERS } from './data/towers';

export type Lang = 'pl' | 'en';
export const LANGS: Lang[] = ['pl', 'en'];
export const LANG_NAMES: Record<Lang, string> = { pl: 'Polski', en: 'English' };

let lang: Lang = 'pl';

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang): void {
  lang = l;
}

export function isLang(v: unknown): v is Lang {
  return v === 'pl' || v === 'en';
}

// ------------------------------------------------------------- UI strings

const PL = {
  'app.title': 'Jamniki kontra Odkurzacze',
  'app.tagline': 'Obroń legowisko przed armią odkurzaczy!',

  'hud.lives': 'Życia',
  'hud.money': 'Pieniądze',
  'hud.wave': 'Fala',

  'ctl.start': '▶ Start fali {n}',
  'ctl.running': 'Fala {n} trwa…',
  'ctl.startTitle': 'Spacja',
  'ctl.speedTitle': 'Prędkość gry (F)',
  'ctl.autoOn': 'Auto: tak',
  'ctl.autoOff': 'Auto: nie',
  'ctl.autoTitle': 'Automatycznie startuj kolejne fale',
  'ctl.soundOn': 'Dźwięk: tak',
  'ctl.soundOff': 'Dźwięk: nie',
  'ctl.soundTitle': 'Dźwięk (M)',
  'ctl.pause': 'Pauza',
  'ctl.pauseTitle': 'Pauza (P / Esc)',

  'shop.title': 'Jamniki',

  'panel.howTo': 'Jak grać',
  'panel.hint':
    'Wybierz jamnika ze sklepu (klawisze 1–7) i kliknij na mapie, żeby go postawić. Kliknij postawionego jamnika, żeby go ulepszyć. Spacja startuje falę.',
  'panel.hintSmall': 'Shift + klik stawia kilka jamników pod rząd. Prawy przycisk lub Esc anuluje.',
  'panel.placeHint': 'Kliknij na mapie, żeby postawić. Esc anuluje.',
  'panel.close': 'Zamknij (Esc)',
  'panel.pops': 'Zniszczone: {n}',
  'panel.target': 'Cel: {m}',
  'panel.targetTitle': 'Kogo atakuje ten jamnik (Tab)',
  'panel.max': 'MAKSYMALNY POZIOM',
  'panel.locked': 'Zablokowane przez drugą ścieżkę',
  'panel.sell': 'Sprzedaj za {v}',
  'panel.sellTitle': 'Sprzedaj (Delete)',

  'menu.map': 'Mapa',
  'menu.difficulty': 'Trudność',
  'menu.language': 'Język',
  'menu.play': 'Graj!',
  'menu.best': 'Rekord: fala {n}',
  'menu.bestNone': 'Rekord: —',
  'menu.diffSub': '{n} żyć · ceny ×{m}',

  'pause.title': 'Pauza',
  'pause.resume': 'Wróć do gry',
  'pause.restart': 'Zacznij od nowa',
  'pause.menu': 'Menu główne',

  'end.won': 'Zwycięstwo!',
  'end.lost': 'Odkurzacze wygrały…',
  'end.wonText': 'Legowisko jest bezpieczne. Wszystkie 40 fal odparte!',
  'end.lostText': 'Odkurzacze wciągnęły legowisko. Spróbuj inaczej rozstawić jamniki.',
  'end.wave': 'Fala: {n}',
  'end.pops': 'Zniszczone odkurzacze: {n}',
  'end.towers': 'Jamniki na mapie: {n}',
  'end.record': 'Nowy rekord!',
  'end.endless': 'Graj dalej (bez końca)',
  'end.again': 'Zagraj ponownie',
  'end.menu': 'Menu główne',

  'fx.wave': 'FALA {n}',
  'fx.waveDone': 'FALA {n} ZALICZONA',

  'debug.wave': 'Numer fali',
  'debug.jump': 'Skocz',
  'debug.hitboxes': 'Hitboxy',
} as const;

export type UiKey = keyof typeof PL;

const EN: Record<UiKey, string> = {
  'app.title': 'Dachshunds vs Vacuums',
  'app.tagline': 'Defend the dog bed from the vacuum army!',

  'hud.lives': 'Lives',
  'hud.money': 'Money',
  'hud.wave': 'Wave',

  'ctl.start': '▶ Start wave {n}',
  'ctl.running': 'Wave {n} running…',
  'ctl.startTitle': 'Space',
  'ctl.speedTitle': 'Game speed (F)',
  'ctl.autoOn': 'Auto: on',
  'ctl.autoOff': 'Auto: off',
  'ctl.autoTitle': 'Start the next waves automatically',
  'ctl.soundOn': 'Sound: on',
  'ctl.soundOff': 'Sound: off',
  'ctl.soundTitle': 'Sound (M)',
  'ctl.pause': 'Pause',
  'ctl.pauseTitle': 'Pause (P / Esc)',

  'shop.title': 'Dachshunds',

  'panel.howTo': 'How to play',
  'panel.hint':
    'Pick a dachshund from the shop (keys 1–7) and click the map to place it. Click a placed dachshund to upgrade it. Space starts a wave.',
  'panel.hintSmall': 'Shift + click places several in a row. Right click or Esc cancels.',
  'panel.placeHint': 'Click the map to place it. Esc cancels.',
  'panel.close': 'Close (Esc)',
  'panel.pops': 'Destroyed: {n}',
  'panel.target': 'Target: {m}',
  'panel.targetTitle': 'Which vacuum this dachshund attacks (Tab)',
  'panel.max': 'MAX LEVEL',
  'panel.locked': 'Locked by the other path',
  'panel.sell': 'Sell for {v}',
  'panel.sellTitle': 'Sell (Delete)',

  'menu.map': 'Map',
  'menu.difficulty': 'Difficulty',
  'menu.language': 'Language',
  'menu.play': 'Play!',
  'menu.best': 'Best: wave {n}',
  'menu.bestNone': 'Best: —',
  'menu.diffSub': '{n} lives · prices ×{m}',

  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.menu': 'Main menu',

  'end.won': 'Victory!',
  'end.lost': 'The vacuums won…',
  'end.wonText': 'The dog bed is safe. All 40 waves repelled!',
  'end.lostText': 'The vacuums sucked up the dog bed. Try placing your dachshunds differently.',
  'end.wave': 'Wave: {n}',
  'end.pops': 'Vacuums destroyed: {n}',
  'end.towers': 'Dachshunds on the map: {n}',
  'end.record': 'New record!',
  'end.endless': 'Keep playing (endless)',
  'end.again': 'Play again',
  'end.menu': 'Main menu',

  'fx.wave': 'WAVE {n}',
  'fx.waveDone': 'WAVE {n} CLEARED',

  'debug.wave': 'Wave number',
  'debug.jump': 'Jump',
  'debug.hitboxes': 'Hitboxes',
};

const UI: Record<Lang, Record<UiKey, string>> = { pl: PL, en: EN };

/** Translate a UI string, filling {placeholders}. */
export function t(key: UiKey, params: Record<string, string | number> = {}): string {
  return UI[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export function formatMoney(n: number): string {
  return `$${Math.floor(n).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US')}`;
}

// ------------------------------------------------------------ game data

type Text = [name: string, desc: string];

export interface TowerText {
  name: string;
  short: string;
  desc: string;
  pathNames: [string, string];
  upgrades: [Text[], Text[]];
}

export const TOWER_EN: Record<TowerId, TowerText> = {
  rzucacz: {
    name: 'Thrower Dachshund',
    short: 'Thrower',
    desc: 'Throws bones at nearby vacuums.',
    pathNames: ['Bones', 'Throwing'],
    upgrades: [
      [
        ['Sharp Bone', 'The bone pierces 3 vacuums.'],
        ['Spiked Bone', 'Pierces 5 vacuums, +15 range.'],
        ['Boomerang Bone', 'The bone flies back and hits twice on the way.'],
      ],
      [
        ['Faster Throw', 'Throws 25% faster.'],
        ['Double Bone', 'Throws two bones at once.'],
        ['Bone Storm', 'Five bones, faster and farther.'],
      ],
    ],
  },
  snajper: {
    name: 'Sniper Dachshund',
    short: 'Sniper',
    desc: 'Slingshot with a huge range. Heavy bones pierce armor.',
    pathNames: ['Precision', 'Fire rate'],
    upgrades: [
      [
        ['Night Goggles', 'Detects shadow robots.'],
        ['Heavy Bone', 'Deals 5 damage.'],
        ['Bone Hammer', '12 damage and a stun.'],
      ],
      [
        ['Faster Reload', 'Shoots 30% faster.'],
        ['Burst', 'Shoots twice as fast.'],
        ['Auto Slingshot', 'Constant fire and +2 damage.'],
      ],
    ],
  },
  kopacz: {
    name: 'Digger Dachshund',
    short: 'Digger',
    desc: 'Buries bone traps on the path within its range.',
    pathNames: ['Traps', 'Pits'],
    upgrades: [
      [
        ['More Traps', 'Digs faster, up to 10 traps.'],
        ['Spiked Mounds', '2 damage, 12 hits.'],
        ['Bone Mine', 'Explosive traps break armor.'],
      ],
      [
        ['Glue Traps', 'Traps slow vacuums down.'],
        ['Deep Pits', 'Stronger slow, +1 damage.'],
        ['Trapdoor', 'Small vacuums vanish completely.'],
      ],
    ],
  },
  szczekacz: {
    name: 'Barker Dachshund',
    short: 'Barker',
    desc: 'Barks a sound wave at everything around, shadows included.',
    pathNames: ['Volume', 'Fear'],
    upgrades: [
      [
        ['Louder Bark', '2 damage.'],
        ['Howl', 'Range 120.'],
        ['Thunder Bark', '5 damage, pierces armor.'],
      ],
      [
        ['Fear', 'Slows vacuums down.'],
        ['Paralysis', 'Briefly stuns.'],
        ['Dog Choir', 'Nearby dachshunds attack 20% faster.'],
      ],
    ],
  },
  kucharz: {
    name: 'Chef Dachshund',
    short: 'Chef',
    desc: 'Throws bone bombs. Explosions break armor.',
    pathNames: ['Blast', 'Kitchen'],
    upgrades: [
      [
        ['Bigger Blast', 'Blast radius 55.'],
        ['Marrow Grenade', '3 damage.'],
        ['Doom Cauldron', '10 damage, huge blast and a stun.'],
      ],
      [
        ['Faster Cooking', 'Throws 30% faster.'],
        ['Shrapnel Bones', 'The blast scatters 8 shards.'],
        ['Carpet Bombing', 'Three bombs at once.'],
      ],
    ],
  },
  strazak: {
    name: 'Firefighter Dachshund',
    short: 'Firefighter',
    desc: 'Water shorts vacuums out, and the spark jumps to their neighbours.',
    pathNames: ['Short circuit', 'Stream'],
    upgrades: [
      [
        ['Longer Chain', 'Jumps to 6 vacuums.'],
        ['Wet Floor', 'Hit vacuums slow down.'],
        ['Thunderstorm', '14 jumps, 3 damage.'],
      ],
      [
        ['Stronger Stream', '2 damage.'],
        ['Hydrant', 'Shoots 40% faster.'],
        ['Tsunami', 'Every 10 s a wave floods the whole map.'],
      ],
    ],
  },
  piekarz: {
    name: 'Baker Dachshund',
    short: 'Baker',
    desc: "Doesn't fight. Bakes dog cookies that give money.",
    pathNames: ['Baking', 'Finance'],
    upgrades: [
      [
        ['Bigger Bakes', 'Cookies worth $18.'],
        ['Patisserie', 'Bakes every 2.5 s.'],
        ['Treat Factory', '$40 cookies every 1.5 s.'],
      ],
      [
        ['Wave Bonus', '+$80 after every wave.'],
        ['Bone Bank', '5% interest on cash after a wave (max $300).'],
        ['Golden Bone', '+$400 per wave and 10% interest (max $1000).'],
      ],
    ],
  },
};

export const ENEMY_EN: Record<EnemyId, string> = {
  reczny: 'Handheld vacuum',
  workowy: 'Bag vacuum',
  robot: 'Robot vacuum',
  pionowy: 'Upright vacuum',
  cien: 'Shadow robot',
  przemyslowy: 'Industrial vacuum',
  parowy: 'Steam cleaner',
  megassak: 'MEGA SUCKER',
};

export const MAP_EN: Record<MapId, { name: string; difficulty: string; desc: string }> = {
  salon: { name: 'Living Room', difficulty: 'Easy', desc: 'A long, winding rug through the living room. Good for starters.' },
  kuchnia: { name: 'Kitchen', difficulty: 'Medium', desc: 'A short route, and the furniture takes up space for dachshunds.' },
  ogrod: { name: 'Garden', difficulty: 'Hard', desc: 'Vacuums drive in on two paths at once.' },
};

const DIFFICULTY_TEXT: Record<Lang, Record<Difficulty, string>> = {
  pl: { easy: 'Łatwa', normal: 'Normalna', hard: 'Trudna' },
  en: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },
};

const TARGET_TEXT: Record<Lang, Record<TargetMode, string>> = {
  pl: { first: 'Pierwszy', last: 'Ostatni', strong: 'Najsilniejszy', close: 'Najbliższy' },
  en: { first: 'First', last: 'Last', strong: 'Strongest', close: 'Closest' },
};

const en = () => lang === 'en';

export const towerName = (id: TowerId) => (en() ? TOWER_EN[id].name : TOWERS[id].name);
export const towerShort = (id: TowerId) => (en() ? TOWER_EN[id].short : TOWERS[id].name.replace('Jamnik ', ''));
export const towerDesc = (id: TowerId) => (en() ? TOWER_EN[id].desc : TOWERS[id].desc);
export const pathName = (id: TowerId, path: 0 | 1) => (en() ? TOWER_EN[id].pathNames[path] : TOWERS[id].pathNames[path]);

export function upgradeText(id: TowerId, path: 0 | 1, level: number): { name: string; desc: string } {
  const pl = TOWERS[id].paths[path][level]!;
  const tr = TOWER_EN[id].upgrades[path][level];
  return en() && tr ? { name: tr[0], desc: tr[1] } : { name: pl.name, desc: pl.desc };
}

export const enemyName = (id: EnemyId) => (en() ? ENEMY_EN[id] : ENEMIES[id].name);
export const mapName = (id: MapId) => (en() ? MAP_EN[id].name : MAPS[id].name);
export const mapDesc = (id: MapId) => (en() ? MAP_EN[id].desc : MAPS[id].desc);
export const mapDifficulty = (id: MapId) => (en() ? MAP_EN[id].difficulty : MAPS[id].difficultyLabel);
export const difficultyName = (d: Difficulty) => DIFFICULTY_TEXT[lang][d];
export const targetName = (m: TargetMode) => TARGET_TEXT[lang][m];
