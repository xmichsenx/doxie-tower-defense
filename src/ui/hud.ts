import { t } from '../i18n';
import type { GameWorld } from '../sim/world';
import { h, money, setText, toggleClass } from './dom';
import { icon } from './icons';

export class Hud {
  private readonly lives = h('span', { class: 'hud-value' });
  private readonly cash = h('span', { class: 'hud-value' });
  private readonly wave = h('span', { class: 'hud-value' });
  private readonly livesBox: HTMLElement;

  constructor(root: HTMLElement) {
    this.livesBox = h('div', { class: 'hud-item', title: t('hud.lives') }, icon('heart'), this.lives);
    root.append(
      this.livesBox,
      h('div', { class: 'hud-item', title: t('hud.money') }, icon('coin'), this.cash),
      h('div', { class: 'hud-item', title: t('hud.wave') }, icon('flag'), this.wave),
    );
  }

  update(world: GameWorld): void {
    setText(this.lives, String(world.lives));
    setText(this.cash, money(world.money));
    setText(this.wave, world.endless || world.wave > world.totalWaves ? `${world.wave}` : `${world.wave}/${world.totalWaves}`);
    toggleClass(this.livesBox, 'danger', world.lives <= 20);
  }
}

export interface ControlHandlers {
  startWave(): void;
  cycleSpeed(): void;
  toggleAuto(): void;
  toggleMute(): void;
  pause(): void;
}

export class Controls {
  private readonly start: HTMLButtonElement;
  private readonly speed: HTMLButtonElement;
  private readonly auto: HTMLButtonElement;
  private readonly mute: HTMLButtonElement;

  constructor(root: HTMLElement, handlers: ControlHandlers) {
    this.start = h('button', { class: 'px btn-start', onclick: () => handlers.startWave(), title: t('ctl.startTitle') });
    this.speed = h('button', { class: 'px btn-small', onclick: () => handlers.cycleSpeed(), title: t('ctl.speedTitle') });
    this.auto = h('button', { class: 'px btn-small', onclick: () => handlers.toggleAuto(), title: t('ctl.autoTitle') });
    this.mute = h('button', { class: 'px btn-small', onclick: () => handlers.toggleMute(), title: t('ctl.soundTitle') });
    const pause = h('button', { class: 'px btn-small', text: t('ctl.pause'), onclick: () => handlers.pause(), title: t('ctl.pauseTitle') });
    root.append(this.start, h('div', { class: 'control-row' }, this.speed, this.auto, this.mute, pause));
  }

  update(world: GameWorld, speed: number, auto: boolean, muted: boolean): void {
    const inWave = world.phase === 'wave';
    setText(this.start, inWave ? t('ctl.running', { n: world.wave }) : world.phase === 'idle' ? t('ctl.start', { n: world.wave + 1 }) : '—');
    this.start.disabled = world.phase !== 'idle';
    setText(this.speed, `×${speed}`);
    setText(this.auto, auto ? t('ctl.autoOn') : t('ctl.autoOff'));
    toggleClass(this.auto, 'on', auto);
    setText(this.mute, muted ? t('ctl.soundOff') : t('ctl.soundOn'));
  }
}
