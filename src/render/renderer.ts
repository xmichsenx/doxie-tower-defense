import { ART_SCALE, FIELD_H, FIELD_W, type TowerId, type Vec2 } from '../core/types';
import { TOWERS } from '../data/towers';
import { enemyName } from '../i18n';
import type { Enemy } from '../sim/enemy';
import { COOKIE_RADIUS, TRAP_RADIUS } from '../sim/projectiles';
import { towerTier, type Tower } from '../sim/tower';
import type { GameWorld } from '../sim/world';
import { Assets, type Sprite } from './assets';
import type { Effects } from './effects';
import { drawTextCentered } from './font';
import { PAL } from './palette';

export interface ViewState {
  placing: TowerId | null;
  mouse: Vec2 | null;
  placeValid: boolean;
  selected: Tower | null;
  hitboxes: boolean;
}

const S = ART_SCALE;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly facing = new Map<number, boolean>();

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Draw a sprite centred horizontally on x with its centre at y. */
  private blit(s: Sprite, x: number, y: number): void {
    this.ctx.drawImage(s.canvas, Math.round(x - (s.w * S) / 2), Math.round(y - (s.h * S) / 2), s.w * S, s.h * S);
  }

  private shadow(x: number, y: number, rx: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20,10,5,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(world: GameWorld, view: ViewState, fx: Effects): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (fx.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * fx.shake) * 2, Math.round((Math.random() - 0.5) * fx.shake) * 2);

    const bg = Assets.background(world.map);
    ctx.drawImage(bg.canvas, 0, 0, FIELD_W, FIELD_H);

    for (const trap of world.traps) {
      ctx.globalAlpha = Math.min(1, trap.life / 3 + 0.3);
      this.blit(Assets.trap(trap.variant), trap.pos.x, trap.pos.y);
    }
    ctx.globalAlpha = 1;

    if (view.selected) this.rangeCircle(view.selected.pos, view.selected.stats.range, true);

    // Depth-sort dogs and vacuums by y.
    const drawables: { y: number; draw: () => void }[] = [];
    for (const t of world.towers) drawables.push({ y: t.pos.y, draw: () => this.drawTower(t, world.time, t === view.selected) });
    for (const e of world.enemies) drawables.push({ y: e.pos.y, draw: () => this.drawEnemy(e, world.time) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    for (const p of world.projectiles) {
      if (p.kind === 'bone') this.blit(Assets.bone(Math.floor(p.spin / (Math.PI / 4))), p.pos.x, p.pos.y);
      else if (p.kind === 'bomb') this.blit(Assets.bomb(Math.floor(world.time * 10)), p.pos.x, p.pos.y);
      else {
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(Math.round(p.pos.x) - 2, Math.round(p.pos.y) - 2, 4, 4);
      }
    }

    for (const c of world.cookies) {
      const bob = Math.round(Math.sin(world.time * 5 + c.id) * 2) * 2;
      ctx.globalAlpha = c.ttl < 1.5 ? (Math.floor(c.ttl * 8) % 2 ? 0.4 : 1) : 1;
      this.blit(Assets.cookie(), c.pos.x, c.pos.y + bob);
    }
    ctx.globalAlpha = 1;

    for (const e of world.enemies) if (e.maxHp >= 10 && !e.def.boss) this.hpBar(e);

    fx.drawWorld(ctx);

    if (view.placing && view.mouse) this.drawGhost(view.placing, view.mouse, view.placeValid, world.time);

    if (view.hitboxes) this.drawHitboxes(world);
    ctx.restore();

    this.bossBar(world);
    fx.drawOverlay(ctx, FIELD_W, FIELD_H);
  }

  private rangeCircle(pos: Vec2, r: number, valid: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = valid ? 'rgba(255,255,255,0.13)' : 'rgba(220,40,40,0.18)';
    ctx.strokeStyle = valid ? 'rgba(255,255,255,0.55)' : 'rgba(255,80,80,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.min(r, 1400), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawTower(t: Tower, time: number, selected: boolean): void {
    const ctx = this.ctx;
    this.shadow(t.pos.x, t.pos.y + 14, 22);
    const frame = t.attackAnim > 0 ? 'throw' : Math.floor(time * 3 + t.uid * 0.7) % 4 === 0 ? 'wag' : 'idle';
    const tier = towerTier(t);
    const sprite = Assets.jamnik(t.def.id, frame, tier, t.facing < 0, t.def.id === 'snajper' && t.stats.camoDetect);
    this.blit(sprite, t.pos.x, t.pos.y - 2);
    if (tier >= 3) {
      const sparkle = Math.floor(time * 4 + t.uid) % 6;
      if (sparkle < 2) {
        ctx.fillStyle = PAL.gold;
        ctx.fillRect(t.pos.x + 18 * t.facing, t.pos.y - 22, 2, 6);
        ctx.fillRect(t.pos.x + 16 * t.facing, t.pos.y - 20, 6, 2);
      }
    }
    // Upgrade pips.
    const [a, b] = t.levels;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < a ? PAL.orange : 'rgba(0,0,0,0.35)';
      ctx.fillRect(t.pos.x - 14 + i * 5, t.pos.y + 18, 4, 4);
      ctx.fillStyle = i < b ? PAL.cyan : 'rgba(0,0,0,0.35)';
      ctx.fillRect(t.pos.x + 2 + i * 5, t.pos.y + 18, 4, 4);
    }
    if (selected) {
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(t.pos.x - 30, t.pos.y - 24, 60, 50);
    }
  }

  private drawEnemy(e: Enemy, time: number): void {
    const ctx = this.ctx;
    let flip = this.facing.get(e.uid) ?? false;
    if (e.dir.x < -0.1) flip = true;
    else if (e.dir.x > 0.1) flip = false;
    this.facing.set(e.uid, flip);
    if (this.facing.size > 4000) this.facing.clear();

    const frame = Math.floor(time * 8 + e.uid) % 2;
    this.shadow(e.pos.x, e.pos.y + e.def.radius * 0.7, e.def.radius);
    if (e.def.camo) ctx.globalAlpha = 0.55;
    const sprite = e.flash > 0 ? Assets.vacuumFlash(e.def.id, frame, flip) : Assets.vacuum(e.def.id, frame, flip);
    this.blit(sprite, e.pos.x, e.pos.y - 2);
    ctx.globalAlpha = 1;
    if (e.stunTime > 0) {
      ctx.fillStyle = PAL.yellow;
      const a = time * 8;
      for (let i = 0; i < 3; i++) {
        const ang = a + (i * Math.PI * 2) / 3;
        ctx.fillRect(Math.round(e.pos.x + Math.cos(ang) * 10), Math.round(e.pos.y - e.def.radius - 6 + Math.sin(ang) * 3), 4, 4);
      }
    } else if (e.slowTime > 0) {
      ctx.fillStyle = 'rgba(111,211,238,0.8)';
      ctx.fillRect(Math.round(e.pos.x - 8), Math.round(e.pos.y + e.def.radius * 0.5), 4, 4);
      ctx.fillRect(Math.round(e.pos.x + 4), Math.round(e.pos.y + e.def.radius * 0.5 + 2), 4, 4);
    }
  }

  private hpBar(e: Enemy): void {
    const ctx = this.ctx;
    const w = e.def.radius * 2;
    const x = Math.round(e.pos.x - w / 2);
    const y = Math.round(e.pos.y - e.def.radius - 12);
    const k = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x - 2, y - 2, w + 4, 8);
    ctx.fillStyle = k > 0.5 ? PAL.green : k > 0.25 ? PAL.yellow : PAL.red;
    ctx.fillRect(x, y, Math.round(w * k), 4);
  }

  private bossBar(world: GameWorld): void {
    const bosses = world.enemies.filter((e) => e.def.boss);
    if (bosses.length === 0) return;
    const ctx = this.ctx;
    const hp = bosses.reduce((s, e) => s + e.hp, 0);
    const max = bosses.reduce((s, e) => s + e.maxHp, 0);
    const w = 400;
    const x = (FIELD_W - w) / 2;
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x - 4, 10, w + 8, 34);
    ctx.fillStyle = PAL.grey5;
    ctx.fillRect(x, 26, w, 14);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x, 26, Math.round((w * hp) / max), 14);
    const name = enemyName('megassak').toUpperCase();
    drawTextCentered(ctx, bosses.length > 1 ? `${name} X${bosses.length}` : name, FIELD_W / 2, 13, 2, PAL.gold);
  }

  private drawGhost(id: TowerId, pos: Vec2, valid: boolean, time: number): void {
    const def = TOWERS[id];
    this.rangeCircle(pos, def.base.range ?? 120, valid);
    this.ctx.globalAlpha = valid ? 0.85 : 0.5;
    this.blit(Assets.jamnik(id, Math.floor(time * 3) % 2 ? 'wag' : 'idle', 0, false, false), pos.x, pos.y - 2);
    this.ctx.globalAlpha = 1;
  }

  private drawHitboxes(world: GameWorld): void {
    const ctx = this.ctx;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff00ff';
    for (const e of world.enemies) {
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.def.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#00ffff';
    for (const t of world.towers) {
      ctx.beginPath();
      ctx.arc(t.pos.x, t.pos.y, t.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffff00';
    for (const t of world.traps) {
      ctx.beginPath();
      ctx.arc(t.pos.x, t.pos.y, TRAP_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const c of world.cookies) {
      ctx.beginPath();
      ctx.arc(c.pos.x, c.pos.y, COOKIE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,0,0,0.6)';
    for (const d of world.map.decorations) ctx.strokeRect(d.x, d.y, d.w, d.h);
  }
}
