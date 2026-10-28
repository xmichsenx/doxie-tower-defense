import type { Difficulty, MapId } from '../core/types';
import { MAPS, MAP_ORDER } from '../data/maps';
import { LANGS, LANG_NAMES, difficultyName, getLang, mapDesc, mapDifficulty, mapName, t, type Lang } from '../i18n';
import { Assets } from '../render/assets';
import { DIFFICULTIES } from '../sim/economy';
import type { GameWorld } from '../sim/world';
import { getBestWave } from '../storage';
import { h } from './dom';
import { jamnikIcon, spriteCanvas } from './icons';

export interface ScreenHandlers {
  start(map: MapId, diff: Difficulty): void;
  resume(): void;
  restart(): void;
  menu(): void;
  endless(): void;
  setLang(lang: Lang): void;
}

export class Screens {
  private map: MapId = 'salon';
  private diff: Difficulty = 'normal';

  constructor(
    private readonly root: HTMLElement,
    private readonly handlers: ScreenHandlers,
  ) {}

  get visible(): boolean {
    return this.root.childElementCount > 0;
  }

  hide(): void {
    this.root.replaceChildren();
    this.root.className = '';
  }

  private show(cls: string, ...children: HTMLElement[]): void {
    this.root.replaceChildren(h('div', { class: `screen-box ${cls}` }, ...children));
    this.root.className = 'open';
  }

  showMenu(): void {
    const maps = h('div', { class: 'map-list' });
    const diffs = h('div', { class: 'diff-list' });
    const render = () => {
      maps.replaceChildren();
      for (const id of MAP_ORDER) {
        const thumb = spriteCanvas(Assets.background(MAPS[id]), 0.5, 'map-thumb');
        const best = getBestWave(id, this.diff);
        maps.append(
          h(
            'button',
            {
              class: `px map-card ${id === this.map ? 'active' : ''}`,
              onclick: () => {
                this.map = id;
                render();
              },
            },
            thumb,
            h('span', { class: 'map-name', text: mapName(id) }),
            h('span', { class: 'map-diff', text: mapDifficulty(id) }),
            h('span', { class: 'map-desc', text: mapDesc(id) }),
            h('span', { class: 'map-best', text: best > 0 ? t('menu.best', { n: best }) : t('menu.bestNone') }),
          ),
        );
      }
      diffs.replaceChildren();
      for (const d of ['easy', 'normal', 'hard'] as Difficulty[]) {
        const def = DIFFICULTIES[d];
        diffs.append(
          h(
            'button',
            {
              class: `px diff ${d === this.diff ? 'active' : ''}`,
              onclick: () => {
                this.diff = d;
                render();
              },
            },
            h('span', { class: 'diff-name', text: difficultyName(d) }),
            h('span', { class: 'diff-sub', text: t('menu.diffSub', { n: def.lives, m: def.priceMult }) }),
          ),
        );
      }
    };
    render();
    const langs = h(
      'div',
      { class: 'lang-list', title: t('menu.language') },
      ...LANGS.map((l) =>
        h('button', {
          class: `px lang ${l === getLang() ? 'active' : ''}`,
          text: LANG_NAMES[l],
          onclick: () => {
            this.handlers.setLang(l);
            this.showMenu();
          },
        }),
      ),
    );
    const title = h(
      'div',
      { class: 'title' },
      jamnikIcon('rzucacz', 4),
      h('div', {}, h('h1', { text: t('app.title') }), h('p', { class: 'tagline', text: t('app.tagline') })),
      jamnikIcon('strazak', 4),
    );
    this.show(
      'menu',
      langs,
      title,
      h('div', { class: 'section-title', text: t('menu.map') }),
      maps,
      h('div', { class: 'section-title', text: t('menu.difficulty') }),
      diffs,
      h('button', { class: 'px btn-big', text: t('menu.play'), onclick: () => this.handlers.start(this.map, this.diff) }),
    );
  }

  showPause(): void {
    this.show(
      'pause',
      h('h2', { text: t('pause.title') }),
      h(
        'div',
        { class: 'btn-col' },
        h('button', { class: 'px btn-big', text: t('pause.resume'), onclick: () => this.handlers.resume() }),
        h('button', { class: 'px', text: t('pause.restart'), onclick: () => this.handlers.restart() }),
        h('button', { class: 'px', text: t('pause.menu'), onclick: () => this.handlers.menu() }),
      ),
    );
  }

  showEnd(world: GameWorld, won: boolean, record: boolean): void {
    const stats = h(
      'div',
      { class: 'end-stats' },
      h('div', { text: t('end.wave', { n: world.wave }) }),
      h('div', { text: t('end.pops', { n: world.stats.pops }) }),
      h('div', { text: t('end.towers', { n: world.towers.length }) }),
      record ? h('div', { class: 'record', text: t('end.record') }) : null,
    );
    this.show(
      won ? 'won' : 'lost',
      h('h2', { text: won ? t('end.won') : t('end.lost') }),
      h('p', { text: won ? t('end.wonText') : t('end.lostText') }),
      stats,
      h(
        'div',
        { class: 'btn-col' },
        won ? h('button', { class: 'px btn-big', text: t('end.endless'), onclick: () => this.handlers.endless() }) : null,
        h('button', { class: `px ${won ? '' : 'btn-big'}`, text: t('end.again'), onclick: () => this.handlers.restart() }),
        h('button', { class: 'px', text: t('end.menu'), onclick: () => this.handlers.menu() }),
      ),
    );
  }
}
