import type { TowerId } from '../core/types';
import { MAX_LEVEL } from '../data/towers';
import { pathName, t, targetName, towerDesc, towerName, upgradeText } from '../i18n';
import { canUpgrade, towerSellValue, towerTier, type Tower } from '../sim/tower';
import type { GameWorld } from '../sim/world';
import { h, money, setText, toggleClass } from './dom';
import { jamnikIcon } from './icons';

export interface PanelActions {
  upgrade(t: Tower, path: 0 | 1): void;
  sell(t: Tower): void;
  cycleTarget(t: Tower): void;
  close(): void;
}

interface UpgradeButton {
  path: 0 | 1;
  el: HTMLButtonElement;
}

export class TowerPanel {
  private key = '';
  private buttons: UpgradeButton[] = [];
  private pops: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: PanelActions,
  ) {}

  update(world: GameWorld, selected: Tower | null, placing: TowerId | null): void {
    const key = selected
      ? `t:${selected.uid}:${selected.levels.join(',')}:${selected.targetMode}`
      : placing
        ? `p:${placing}`
        : 'none';
    if (key !== this.key) {
      this.key = key;
      this.buttons = [];
      this.pops = null;
      this.root.replaceChildren();
      if (selected) this.buildTower(world, selected);
      else if (placing) this.buildPlacing(world, placing);
      else this.buildHint();
    }
    if (selected) {
      if (this.pops) setText(this.pops, t('panel.pops', { n: selected.pops }));
      for (const b of this.buttons) {
        const price = world.upgradePrice(selected, b.path);
        const poor = price === null || world.money < price;
        b.el.disabled = poor;
        toggleClass(b.el, 'poor', poor);
      }
    }
  }

  private buildHint(): void {
    this.root.append(
      h('div', { class: 'section-title', text: t('panel.howTo') }),
      h('p', { class: 'hint', text: t('panel.hint') }),
      h('p', { class: 'hint small', text: t('panel.hintSmall') }),
    );
  }

  private buildPlacing(world: GameWorld, id: TowerId): void {
    this.root.append(
      h(
        'div',
        { class: 'panel-head' },
        jamnikIcon(id, 2),
        h('div', {}, h('div', { class: 'panel-name', text: towerName(id) }), h('div', { class: 'panel-sub', text: money(world.towerPrice(id)) })),
      ),
      h('p', { class: 'hint', text: towerDesc(id) }),
      h('p', { class: 'hint small', text: t('panel.placeHint') }),
    );
  }

  private buildTower(world: GameWorld, tw: Tower): void {
    const def = tw.def;
    this.pops = h('div', { class: 'panel-sub' });
    const close = h('button', { class: 'px btn-x', text: '×', title: t('panel.close'), onclick: () => this.actions.close() });
    this.root.append(
      h(
        'div',
        { class: 'panel-head' },
        jamnikIcon(def.id, 2, towerTier(tw)),
        h('div', { class: 'grow' }, h('div', { class: 'panel-name', text: towerName(def.id) }), this.pops),
        close,
      ),
    );
    if (def.kind !== 'income' && def.kind !== 'pulse' && def.kind !== 'trap') {
      this.root.append(
        h('button', {
          class: 'px btn-wide',
          text: t('panel.target', { m: targetName(tw.targetMode) }),
          title: t('panel.targetTitle'),
          onclick: () => this.actions.cycleTarget(tw),
        }),
      );
    }
    for (const path of [0, 1] as const) {
      const level = tw.levels[path];
      const pips = h('span', { class: 'pips' });
      for (let i = 0; i < MAX_LEVEL; i++) pips.append(h('span', { class: `pip ${i < level ? `on p${path}` : ''}` }));
      const box = h('div', { class: `upgrade p${path}` }, h('div', { class: 'upgrade-head' }, h('span', { text: pathName(def.id, path) }), pips));
      if (!def.paths[path][level]) {
        box.append(h('div', { class: 'upgrade-max', text: t('panel.max') }));
      } else if (!canUpgrade(tw, path)) {
        box.append(h('div', { class: 'upgrade-max', text: t('panel.locked') }));
      } else {
        const next = upgradeText(def.id, path, level);
        const price = world.upgradePrice(tw, path) ?? 0;
        const btn = h(
          'button',
          { class: 'px btn-upgrade', title: `${next.name}: ${next.desc}`, onclick: () => this.actions.upgrade(tw, path) },
          h('span', { class: 'up-name', text: next.name }),
          h('span', { class: 'up-desc', text: next.desc }),
          h('span', { class: 'up-price', text: money(price) }),
        );
        this.buttons.push({ path, el: btn });
        box.append(btn);
      }
      this.root.append(box);
    }
    this.root.append(
      h('button', {
        class: 'px btn-sell',
        text: t('panel.sell', { v: money(towerSellValue(tw)) }),
        title: t('panel.sellTitle'),
        onclick: () => this.actions.sell(tw),
      }),
    );
  }
}
