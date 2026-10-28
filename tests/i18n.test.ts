import { afterEach, describe, expect, it } from 'vitest';
import { ENEMY_ORDER } from '../src/data/enemies';
import { MAP_ORDER } from '../src/data/maps';
import { TOWERS, TOWER_ORDER } from '../src/data/towers';
import {
  ENEMY_EN,
  LANGS,
  MAP_EN,
  TOWER_EN,
  difficultyName,
  enemyName,
  formatMoney,
  getLang,
  isLang,
  mapName,
  setLang,
  t,
  targetName,
  towerName,
  towerShort,
  upgradeText,
} from '../src/i18n';
import { FONT } from '../src/render/font';

afterEach(() => setLang('pl'));

describe('i18n', () => {
  it('switches language', () => {
    setLang('pl');
    expect(t('menu.play')).toBe('Graj!');
    setLang('en');
    expect(getLang()).toBe('en');
    expect(t('menu.play')).toBe('Play!');
  });

  it('fills placeholders', () => {
    setLang('en');
    expect(t('ctl.start', { n: 7 })).toBe('▶ Start wave 7');
    setLang('pl');
    expect(t('panel.sell', { v: '$140' })).toBe('Sprzedaj za $140');
  });

  it('validates language codes', () => {
    expect(isLang('pl')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('de')).toBe(false);
    expect(isLang(null)).toBe(false);
  });

  it('formats money for each locale', () => {
    setLang('en');
    expect(formatMoney(12345)).toBe('$12,345');
    setLang('pl');
    expect(formatMoney(5)).toBe('$5');
  });

  it('translates every tower and upgrade into English', () => {
    for (const id of TOWER_ORDER) {
      const tr = TOWER_EN[id];
      expect(tr.name.length, id).toBeGreaterThan(0);
      expect(tr.short.length, id).toBeGreaterThan(0);
      expect(tr.desc.length, id).toBeGreaterThan(0);
      for (const path of [0, 1] as const) {
        expect(tr.upgrades[path]).toHaveLength(TOWERS[id].paths[path].length);
        for (const [name, desc] of tr.upgrades[path]) {
          expect(name.length).toBeGreaterThan(0);
          expect(desc.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('data lookups follow the current language', () => {
    setLang('pl');
    expect(towerName('rzucacz')).toBe('Jamnik Rzucacz');
    expect(towerShort('rzucacz')).toBe('Rzucacz');
    expect(upgradeText('rzucacz', 0, 0).name).toBe('Ostra kość');
    expect(mapName('ogrod')).toBe('Ogród');
    expect(difficultyName('hard')).toBe('Trudna');
    expect(targetName('first')).toBe('Pierwszy');
    setLang('en');
    expect(towerName('rzucacz')).toBe('Thrower Dachshund');
    expect(upgradeText('rzucacz', 0, 0).name).toBe('Sharp Bone');
    expect(mapName('ogrod')).toBe('Garden');
    expect(difficultyName('hard')).toBe('Hard');
    expect(targetName('first')).toBe('First');
  });

  it('has English names for every enemy and map', () => {
    for (const id of ENEMY_ORDER) expect(ENEMY_EN[id].length).toBeGreaterThan(0);
    for (const id of MAP_ORDER) expect(MAP_EN[id].name.length).toBeGreaterThan(0);
  });

  it('canvas texts only use characters the pixel font has', () => {
    for (const lang of LANGS) {
      setLang(lang);
      const texts = [t('fx.wave', { n: 12 }), t('fx.waveDone', { n: 40 }), enemyName('megassak').toUpperCase() + ' X3'];
      for (const text of texts) for (const ch of text) expect(ch in FONT || ch.toUpperCase() in FONT, `${lang}: '${ch}' in "${text}"`).toBe(true);
    }
  });
});
