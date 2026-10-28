import type { EnemyId, Vec2 } from '../core/types';
import type { GameEvent } from '../sim/world';
import { FIELD_W } from '../core/types';
import { t } from '../i18n';
import { drawTextCentered } from './font';
import { PAL } from './palette';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  gravity: number;
}

interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
}

interface Bolt {
  points: Vec2[];
  life: number;
  max: number;
}

interface Tracer {
  from: Vec2;
  to: Vec2;
  life: number;
  max: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

interface Banner {
  text: string;
  sub: string;
  life: number;
  max: number;
}

const ENEMY_COLORS: Record<EnemyId, string> = {
  reczny: PAL.yellow,
  workowy: PAL.red,
  robot: PAL.grey2,
  pionowy: PAL.blue,
  cien: PAL.purple,
  przemyslowy: PAL.grey3,
  parowy: PAL.teal,
  megassak: PAL.redDark,
};

/** Purely visual effects driven by simulation events. */
export class Effects {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private bolts: Bolt[] = [];
  private tracers: Tracer[] = [];
  private floaters: Floater[] = [];
  private banner: Banner | null = null;
  shake = 0;
  private redFlash = 0;
  private tsunami = 0;

  private burst(pos: Vec2, n: number, colors: readonly string[], speed: number, life: number, size = 4, gravity = 0): void {
    if (this.particles.length > 900) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.6),
        max: life,
        color: colors[i % colors.length]!,
        size,
        gravity,
      });
    }
  }

  float(pos: Vec2, text: string, color: string = PAL.gold, size = 2): void {
    this.floaters.push({ x: pos.x, y: pos.y - 10, text, color, life: 1, max: 1, size });
  }

  showBanner(text: string, sub = '', seconds = 2): void {
    this.banner = { text, sub, life: seconds, max: seconds };
  }

  handle(ev: GameEvent): void {
    switch (ev.type) {
      case 'pop':
        this.burst(ev.pos, 6, [PAL.grey2, PAL.grey1, ENEMY_COLORS[ev.enemy]], 90, 0.4, 4, 160);
        this.burst(ev.pos, 2, [PAL.grey4], 120, 0.5, 2, 300);
        if (ev.enemy === 'megassak' || ev.enemy === 'przemyslowy') this.shake = Math.max(this.shake, ev.enemy === 'megassak' ? 8 : 2);
        break;
      case 'clank':
        this.burst(ev.pos, 4, [PAL.yellow, PAL.white], 140, 0.18, 2);
        break;
      case 'leak':
        this.redFlash = 0.35;
        this.shake = Math.max(this.shake, 5);
        break;
      case 'hitscan':
        this.tracers.push({ from: ev.from, to: ev.to, life: 0.1, max: 0.1 });
        this.burst(ev.to, 3, [PAL.cream, PAL.white], 100, 0.2, 2);
        break;
      case 'explosion':
        this.rings.push({ x: ev.pos.x, y: ev.pos.y, r0: 6, r1: ev.radius, life: 0.25, max: 0.25, color: PAL.orange });
        this.burst(ev.pos, 12, [PAL.orange, PAL.yellow, PAL.grey3, PAL.red], ev.radius * 3, 0.45, 4);
        this.shake = Math.max(this.shake, 2);
        break;
      case 'chain':
        this.bolts.push({ points: ev.points, life: 0.16, max: 0.16 });
        for (const p of ev.points.slice(1)) this.burst(p, 2, [PAL.cyan, PAL.white], 80, 0.2, 2);
        break;
      case 'bark':
        this.rings.push({ x: ev.pos.x, y: ev.pos.y, r0: 12, r1: ev.radius, life: 0.3, max: 0.3, color: PAL.white });
        break;
      case 'trap':
        this.burst(ev.pos, 4, [PAL.wood3, PAL.wood4], 50, 0.3, 2, 100);
        break;
      case 'money':
        this.float(ev.pos, `+$${ev.amount}`);
        break;
      case 'sell':
        this.float(ev.pos, `+$${ev.amount}`);
        this.burst(ev.pos, 8, [PAL.grey2, PAL.cream], 80, 0.4, 4);
        break;
      case 'place':
        this.burst({ x: ev.pos.x, y: ev.pos.y + 10 }, 10, [PAL.cream, PAL.grey2], 70, 0.35, 4);
        break;
      case 'upgrade':
        this.burst(ev.pos, 14, [PAL.gold, PAL.yellow, PAL.white], 110, 0.6, 2, -40);
        break;
      case 'tsunami':
        this.tsunami = 1.2;
        break;
      case 'waveStart':
        this.showBanner(t('fx.wave', { n: ev.wave }), '', 1.6);
        break;
      case 'waveEnd':
        this.showBanner(t('fx.waveDone', { n: ev.wave }), `+$${ev.bonus}`, 2);
        break;
      default:
        break;
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const list of [this.rings, this.bolts, this.tracers, this.floaters] as { life: number }[][]) for (const r of list) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    this.bolts = this.bolts.filter((r) => r.life > 0);
    this.tracers = this.tracers.filter((r) => r.life > 0);
    this.floaters = this.floaters.filter((r) => r.life > 0);
    for (const f of this.floaters) f.y -= 30 * dt;
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - dt * 20);
    this.redFlash = Math.max(0, this.redFlash - dt);
    this.tsunami = Math.max(0, this.tsunami - dt);
  }

  drawWorld(ctx: CanvasRenderingContext2D): void {
    for (const t of this.tracers) {
      ctx.globalAlpha = t.life / t.max;
      ctx.strokeStyle = PAL.cream;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.from.x, t.from.y - 6);
      ctx.lineTo(t.to.x, t.to.y);
      ctx.stroke();
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = (r.life / r.max) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const b of this.bolts) {
      ctx.globalAlpha = b.life / b.max;
      for (const [color, width] of [
        [PAL.blue, 6],
        [PAL.cyan, 3],
        [PAL.white, 1],
      ] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        b.points.forEach((p, i) => {
          if (i === 0) {
            ctx.moveTo(p.x, p.y);
            return;
          }
          const prev = b.points[i - 1]!;
          const mx = (prev.x + p.x) / 2 + (Math.random() - 0.5) * 14;
          const my = (prev.y + p.y) / 2 + (Math.random() - 0.5) * 14;
          ctx.lineTo(mx, my);
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x / 2) * 2 - p.size / 2, Math.round(p.y / 2) * 2 - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, (f.life / f.max) * 2);
      drawTextCentered(ctx, f.text, f.x, Math.round(f.y), f.size, f.color, PAL.outline);
    }
    ctx.globalAlpha = 1;
  }

  drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.tsunami > 0) {
      const k = 1 - this.tsunami / 1.2;
      const x = -200 + k * (w + 400);
      ctx.globalAlpha = 0.45 * Math.sin(k * Math.PI);
      ctx.fillStyle = PAL.cyan;
      ctx.fillRect(x - 160, 0, 160, h);
      ctx.fillStyle = PAL.white;
      for (let y = 0; y < h; y += 16) ctx.fillRect(x - 8 + ((y / 16) % 2) * 6, y, 8, 8);
      ctx.globalAlpha = 1;
    }
    if (this.redFlash > 0) {
      ctx.globalAlpha = this.redFlash * 0.6;
      ctx.fillStyle = PAL.red;
      ctx.fillRect(0, 0, w, 8);
      ctx.fillRect(0, h - 8, w, 8);
      ctx.fillRect(0, 0, 8, h);
      ctx.fillRect(w - 8, 0, 8, h);
      ctx.globalAlpha = 1;
    }
    if (this.banner) {
      const b = this.banner;
      const t = b.max - b.life;
      const alpha = Math.min(1, t * 4, b.life * 3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(20,12,10,0.55)';
      ctx.fillRect(0, 230, FIELD_W, b.sub ? 110 : 80);
      drawTextCentered(ctx, b.text, w / 2, 245, 8, PAL.gold, PAL.outline);
      if (b.sub) drawTextCentered(ctx, b.sub, w / 2, 300, 5, PAL.white, PAL.outline);
      ctx.globalAlpha = 1;
    }
  }
}
