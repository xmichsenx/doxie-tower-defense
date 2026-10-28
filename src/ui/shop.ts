import type { TowerId } from '../core/types';
import { TOWER_ORDER } from '../data/towers';
import { t, towerDesc, towerName, towerShort } from '../i18n';
import type { GameWorld } from '../sim/world';
import { h, money, setText, toggleClass } from './dom';
import { jamnikIcon } from './icons';

interface Card {
  id: TowerId;
  el: HTMLButtonElement;
  price: HTMLElement;
}

export class Shop {
  private readonly cards: Card[] = [];

  constructor(root: HTMLElement, onPick: (id: TowerId) => void) {
    root.append(h('div', { class: 'section-title', text: t('shop.title') }));
    const grid = h('div', { class: 'shop-grid' });
    TOWER_ORDER.forEach((id, i) => {
      const price = h('span', { class: 'card-price' });
      const el = h(
        'button',
        { class: 'px card', title: `${towerName(id)} (${i + 1})\n${towerDesc(id)}`, onclick: () => onPick(id) },
        h('span', { class: 'card-key', text: String(i + 1) }),
        jamnikIcon(id, 2),
        h('span', { class: 'card-name', text: towerShort(id) }),
        price,
      );
      grid.append(el);
      this.cards.push({ id, el, price });
    });
    root.append(grid);
  }

  update(world: GameWorld, placing: TowerId | null): void {
    for (const c of this.cards) {
      const price = world.towerPrice(c.id);
      setText(c.price, money(price));
      toggleClass(c.el, 'poor', world.money < price);
      toggleClass(c.el, 'active', placing === c.id);
    }
  }
}
