import { Sfx, type SoundName } from './audio/sfx';
import { dist } from './core/math';
import { FIELD_H, FIELD_W, SIM_DT, type Difficulty, type MapId, type TowerId, type Vec2 } from './core/types';
import { TOWER_ORDER } from './data/towers';
import { Effects } from './render/effects';
import { Renderer } from './render/renderer';
import { COOKIE_RADIUS } from './sim/projectiles';
import type { Tower } from './sim/tower';
import { GameWorld, type GameEvent } from './sim/world';
import { isLang, setLang, t, type Lang } from './i18n';
import { getSetting, getStringSetting, recordWave, setSetting, setStringSetting } from './storage';
import { h } from './ui/dom';
import { Controls, Hud } from './ui/hud';
import { Screens } from './ui/menu';
import { Shop } from './ui/shop';
import { TowerPanel } from './ui/towerPanel';

const SPEEDS = [1, 2, 3];
const ATTACK_SOUNDS: Record<TowerId, SoundName | null> = {
  rzucacz: 'throw',
  snajper: 'sling',
  kopacz: null,
  szczekacz: 'bark',
  kucharz: 'throw',
  strazak: 'zap',
  piekarz: null,
};

export class App {
  private world: GameWorld | null = null;
  private readonly renderer: Renderer;
  private effects = new Effects();
  private readonly sfx = new Sfx();
  private hud!: Hud;
  private controls!: Controls;
  private shop!: Shop;
  private panel!: TowerPanel;
  private readonly screens: Screens;

  private mapId: MapId = 'salon';
  private diff: Difficulty = 'normal';
  private placing: TowerId | null = null;
  private selected: Tower | null = null;
  private mouse: Vec2 | null = null;
  private speed = 1;
  private paused = false;
  private autoStart = getSetting('auto', false);
  private hitboxes = false;
  private ended = false;
  private readonly debug = new URLSearchParams(location.search).has('debug');

  private last = 0;
  private acc = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.sfx.muted = getSetting('muted', false);
    const saved = getStringSetting('lang');
    this.applyLang(isLang(saved) ? saved : navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en');
    this.screens = new Screens(document.getElementById('screens')!, {
      start: (map, diff) => this.newGame(map, diff),
      resume: () => this.resume(),
      restart: () => this.newGame(this.mapId, this.diff),
      menu: () => this.showMenu(),
      endless: () => {
        this.world?.continueEndless();
        this.ended = false;
        this.screens.hide();
      },
      setLang: (lang) => {
        this.applyLang(lang);
        setStringSetting('lang', lang);
        this.buildUi();
      },
    });
    this.buildUi();
    this.bindInput();
    this.fitToWindow();
    window.addEventListener('resize', () => this.fitToWindow());
    this.newGame('salon', 'normal');
    this.showMenu();
    requestAnimationFrame((now) => this.frame(now));
  }

  private applyLang(lang: Lang): void {
    setLang(lang);
    document.documentElement.lang = lang;
    document.title = t('app.title');
  }

  /** (Re)create the side panel, e.g. after switching language. */
  private buildUi(): void {
    for (const id of ['hud', 'shop', 'panel', 'controls']) document.getElementById(id)!.replaceChildren();
    document.querySelector('.debug-bar')?.remove();
    this.hud = new Hud(document.getElementById('hud')!);
    this.shop = new Shop(document.getElementById('shop')!, (id) => this.pick(id));
    this.panel = new TowerPanel(document.getElementById('panel')!, {
      upgrade: (t, path) => {
        if (this.world?.upgradeTower(t, path)) this.sfx.play('upgrade');
        else this.sfx.play('error');
      },
      sell: (t) => {
        this.world?.sellTower(t);
        this.selected = null;
      },
      cycleTarget: (t) => {
        this.world?.cycleTargetMode(t);
        this.sfx.play('click');
      },
      close: () => (this.selected = null),
    });
    this.controls = new Controls(document.getElementById('controls')!, {
      startWave: () => this.startWave(),
      cycleSpeed: () => this.cycleSpeed(),
      toggleAuto: () => {
        this.autoStart = !this.autoStart;
        setSetting('auto', this.autoStart);
      },
      toggleMute: () => this.toggleMute(),
      pause: () => this.pause(),
    });
    if (this.debug) this.buildDebugBar();
  }

  private fitToWindow(): void {
    const app = document.getElementById('app')!;
    const scale = Math.min(window.innerWidth / app.offsetWidth, window.innerHeight / app.offsetHeight, 2);
    app.style.transform = `scale(${Math.max(0.3, scale * 0.98)})`;
  }

  private newGame(map: MapId, diff: Difficulty): void {
    this.mapId = map;
    this.diff = diff;
    this.world = new GameWorld({ mapId: map, difficulty: diff, seed: Date.now() & 0xffff });
    if (this.debug) this.world.money = 99999;
    this.effects = new Effects();
    this.placing = null;
    this.selected = null;
    this.paused = false;
    this.ended = false;
    this.acc = 0;
    this.screens.hide();
    this.sfx.unlock();
  }

  private showMenu(): void {
    this.paused = true;
    this.screens.showMenu();
  }

  private pause(): void {
    if (this.ended || this.screens.visible) return;
    this.paused = true;
    this.screens.showPause();
  }

  private resume(): void {
    this.paused = false;
    this.screens.hide();
  }

  private pick(id: TowerId): void {
    this.sfx.unlock();
    this.selected = null;
    this.placing = this.placing === id ? null : id;
    this.sfx.play('click');
  }

  private startWave(): void {
    this.sfx.unlock();
    this.world?.startWave();
  }

  private cycleSpeed(): void {
    this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length]!;
  }

  private toggleMute(): void {
    this.sfx.muted = !this.sfx.muted;
    setSetting('muted', this.sfx.muted);
  }

  // ---------------------------------------------------------------- input

  private toField(ev: MouseEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * FIELD_W, y: ((ev.clientY - r.top) / r.height) * FIELD_H };
  }

  private bindInput(): void {
    this.canvas.addEventListener('mousemove', (ev) => (this.mouse = this.toField(ev)));
    this.canvas.addEventListener('mouseleave', () => (this.mouse = null));
    this.canvas.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      this.placing = null;
      this.selected = null;
    });
    this.canvas.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      this.sfx.unlock();
      this.click(this.toField(ev), ev.shiftKey);
    });
    window.addEventListener('keydown', (ev) => this.key(ev));
  }

  private click(pos: Vec2, keepPlacing: boolean): void {
    const world = this.world;
    if (!world || this.paused) return;
    if (this.placing) {
      const t = world.placeTower(this.placing, pos);
      if (t) {
        this.sfx.play('place');
        if (!keepPlacing || world.money < world.towerPrice(this.placing)) this.placing = null;
      } else {
        this.sfx.play('error');
      }
      return;
    }
    const cookie = world.cookies.find((c) => dist(c.pos, pos) <= COOKIE_RADIUS + 4);
    if (cookie) {
      world.collectCookie(cookie.id);
      return;
    }
    const tower = world.towers.find((t) => dist(t.pos, pos) <= t.radius + 8) ?? null;
    this.selected = tower;
    if (tower) this.sfx.play('click');
  }

  private key(ev: KeyboardEvent): void {
    if (ev.target instanceof HTMLInputElement) return;
    const world = this.world;
    if (!world) return;
    if (ev.key === 'Escape') {
      if (this.placing || this.selected) {
        this.placing = null;
        this.selected = null;
      } else if (this.paused && !this.ended) this.resume();
      else this.pause();
      return;
    }
    if (this.screens.visible) return;
    const n = Number(ev.key);
    if (n >= 1 && n <= TOWER_ORDER.length) {
      this.pick(TOWER_ORDER[n - 1]!);
      return;
    }
    switch (ev.key) {
      case ' ':
        ev.preventDefault();
        if (world.phase === 'idle') this.startWave();
        else this.cycleSpeed();
        break;
      case 'f':
      case 'F':
        this.cycleSpeed();
        break;
      case 'p':
      case 'P':
        this.pause();
        break;
      case 'm':
      case 'M':
        this.toggleMute();
        break;
      case 'h':
      case 'H':
        if (this.debug) this.hitboxes = !this.hitboxes;
        break;
      case 'Tab':
        ev.preventDefault();
        if (this.selected) world.cycleTargetMode(this.selected);
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selected) {
          world.sellTower(this.selected);
          this.selected = null;
        }
        break;
    }
  }

  private buildDebugBar(): void {
    const input = h('input', { class: 'debug-input', title: t('debug.wave') });
    input.value = '20';
    const bar = h(
      'div',
      { class: 'debug-bar' },
      h('span', { text: 'DEBUG' }),
      input,
      h('button', { class: 'px btn-small', text: t('debug.jump'), onclick: () => this.world?.setNextWave(Number(input.value) || 1) }),
      h('button', { class: 'px btn-small', text: '+$10k', onclick: () => this.world && (this.world.money += 10000) }),
      h('button', { class: 'px btn-small', text: t('debug.hitboxes'), onclick: () => (this.hitboxes = !this.hitboxes) }),
    );
    document.getElementById('side')!.append(bar);
  }

  // ----------------------------------------------------------------- loop

  private handleEvent(ev: GameEvent): void {
    this.effects.handle(ev);
    const s = this.sfx;
    switch (ev.type) {
      case 'pop':
        s.play('pop');
        break;
      case 'clank':
        s.play('clank');
        break;
      case 'leak':
        s.play('leak');
        break;
      case 'attack': {
        const name = ATTACK_SOUNDS[ev.tower];
        if (name) s.play(name);
        break;
      }
      case 'explosion':
        s.play('boom');
        break;
      case 'money':
        s.play('coin');
        break;
      case 'waveStart':
        s.play('wave');
        break;
      case 'waveEnd':
        s.play('waveEnd');
        recordWave(this.mapId, this.diff, ev.wave);
        break;
      case 'sell':
        s.play('sell');
        break;
      case 'tsunami':
        s.play('splash');
        break;
      case 'won':
        s.play('win');
        this.finish(true);
        break;
      case 'lost':
        s.play('lose');
        this.finish(false);
        break;
      default:
        break;
    }
  }

  private finish(won: boolean): void {
    const world = this.world!;
    this.ended = true;
    this.placing = null;
    this.selected = null;
    const reached = won ? world.wave : world.wave - 1;
    const record = recordWave(this.mapId, this.diff, Math.max(0, reached));
    setTimeout(() => {
      if (this.world === world) this.screens.showEnd(world, won, record);
    }, 900);
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    const world = this.world;
    if (world) {
      if (!this.paused) {
        if (this.autoStart && world.phase === 'idle' && world.wave > 0 && !this.ended) world.startWave();
        this.acc += dt * this.speed;
        let steps = 0;
        while (this.acc >= SIM_DT && steps < 12) {
          world.step(SIM_DT);
          this.acc -= SIM_DT;
          steps++;
        }
        if (steps === 12) this.acc = 0;
        for (const ev of world.drainEvents()) this.handleEvent(ev);
        this.effects.update(dt * Math.min(this.speed, 2));
      }
      if (this.selected && !world.towers.includes(this.selected)) this.selected = null;
      const placeValid =
        !!this.placing && !!this.mouse && world.placementProblem(this.placing, this.mouse) === null && world.money >= world.towerPrice(this.placing);
      this.renderer.draw(
        world,
        { placing: this.placing, mouse: this.mouse, placeValid, selected: this.selected, hitboxes: this.hitboxes },
        this.effects,
      );
      this.hud.update(world);
      this.shop.update(world, this.placing);
      this.panel.update(world, this.selected, this.placing);
      this.controls.update(world, this.speed, this.autoStart, this.sfx.muted);
    }
    requestAnimationFrame((now) => this.frame(now));
  }
}
