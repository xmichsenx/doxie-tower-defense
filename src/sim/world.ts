import { dist, len, scale, sub } from '../core/math';
import { Path } from '../core/path';
import { Rng } from '../core/rng';
import { FIELD_H, FIELD_W, type DamageType, type Difficulty, type EnemyId, type MapId, type TowerId, type Vec2 } from '../core/types';
import { familyReward } from '../data/enemies';
import { MAPS, type MapDef } from '../data/maps';
import { TOWERS, type TowerStats } from '../data/towers';
import { WAVES, getWave } from '../data/waves';
import { DIFFICULTIES, START_MONEY, interest, priceFor, waveBonus } from './economy';
import {
  applySlow,
  applyStun,
  createEnemy,
  currentSpeed,
  damageEnemy,
  leakValue,
  moveEnemy,
  type Enemy,
  type EnemyFactory,
} from './enemy';
import { placementProblem, type PlacementProblem } from './placement';
import {
  COOKIE_TTL,
  TRAP_RADIUS,
  chainTargets,
  enemiesInRadius,
  touches,
  type Cookie,
  type Projectile,
  type ProjectileKind,
  type Trap,
} from './projectiles';
import {
  TARGET_MODES,
  applyUpgrade,
  computeTrapSpots,
  createTower,
  nextUpgradeBaseCost,
  pickTarget,
  towerSellValue,
  type Tower,
} from './tower';
import { WaveSpawner } from './waves';

export type GamePhase = 'idle' | 'wave' | 'won' | 'lost';

export type GameEvent =
  | { type: 'pop'; pos: Vec2; enemy: EnemyId }
  | { type: 'clank'; pos: Vec2 }
  | { type: 'leak'; pos: Vec2; amount: number }
  | { type: 'attack'; tower: TowerId; pos: Vec2 }
  | { type: 'hitscan'; from: Vec2; to: Vec2 }
  | { type: 'explosion'; pos: Vec2; radius: number }
  | { type: 'chain'; points: Vec2[] }
  | { type: 'bark'; pos: Vec2; radius: number }
  | { type: 'trap'; pos: Vec2 }
  | { type: 'money'; pos: Vec2; amount: number }
  | { type: 'tsunami' }
  | { type: 'waveStart'; wave: number }
  | { type: 'waveEnd'; wave: number; bonus: number }
  | { type: 'place'; pos: Vec2 }
  | { type: 'sell'; pos: Vec2; amount: number }
  | { type: 'upgrade'; pos: Vec2 }
  | { type: 'won' }
  | { type: 'lost' };

export interface WorldOptions {
  mapId: MapId;
  difficulty: Difficulty;
  seed?: number;
}

export class GameWorld {
  readonly map: MapDef;
  readonly paths: Path[];
  readonly difficulty: Difficulty;
  readonly rng: Rng;
  readonly factory: EnemyFactory;

  money = START_MONEY;
  lives: number;
  /** Number of the current (or last started) wave; 0 before the first. */
  wave = 0;
  phase: GamePhase = 'idle';
  endless = false;
  time = 0;

  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  traps: Trap[] = [];
  cookies: Cookie[] = [];
  readonly stats = { pops: 0, leaked: 0 };

  private spawner: WaveSpawner | null = null;
  private uidCounter = 1;
  private spawnCounter = 0;
  private lastClank = -1;
  private events: GameEvent[] = [];

  constructor(opts: WorldOptions) {
    this.map = MAPS[opts.mapId];
    this.paths = this.map.paths.map((pts) => new Path(pts));
    this.difficulty = opts.difficulty;
    this.lives = DIFFICULTIES[opts.difficulty].lives;
    this.rng = new Rng(opts.seed ?? 0x5eed);
    this.factory = { nextUid: () => this.nextId(), hpMult: 1, speedMult: 1 };
  }

  get totalWaves(): number {
    return WAVES.length;
  }

  get spawnsRemaining(): number {
    return this.spawner?.remaining ?? 0;
  }

  nextId(): number {
    return this.uidCounter++;
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(e: GameEvent): void {
    this.events.push(e);
  }

  // ---------------------------------------------------------------- waves

  startWave(): boolean {
    if (this.phase !== 'idle') return false;
    this.wave++;
    const def = getWave(this.wave);
    this.factory.hpMult = def.hpMult;
    this.factory.speedMult = def.speedMult;
    this.spawner = new WaveSpawner(def);
    this.phase = 'wave';
    this.emit({ type: 'waveStart', wave: this.wave });
    return true;
  }

  /** After winning, keep playing endless waves. */
  continueEndless(): void {
    if (this.phase !== 'won') return;
    this.endless = true;
    this.phase = 'idle';
  }

  /** Debug: make the next started wave be n. */
  setNextWave(n: number): void {
    if (this.phase !== 'idle' || n < 1) return;
    this.wave = n - 1;
    if (n > WAVES.length) this.endless = true;
  }

  spawn(id: EnemyId, pathIndex?: number): Enemy {
    const index = pathIndex ?? this.spawnCounter++ % this.paths.length;
    const e = createEnemy(id, this.paths[index]!, index, 0, this.factory);
    this.enemies.push(e);
    return e;
  }

  // --------------------------------------------------------------- towers

  towerPrice(id: TowerId): number {
    return priceFor(TOWERS[id].cost, this.difficulty);
  }

  placementProblem(id: TowerId, pos: Vec2): PlacementProblem {
    return placementProblem(this.map, this.paths, this.towers, pos, TOWERS[id].radius);
  }

  placeTower(id: TowerId, pos: Vec2): Tower | null {
    const price = this.towerPrice(id);
    if (this.money < price || this.placementProblem(id, pos) !== null) return null;
    const t = createTower(this.nextId(), TOWERS[id], pos, price);
    if (t.def.kind === 'trap') t.trapSpots = computeTrapSpots(t, this.paths);
    this.money -= price;
    this.towers.push(t);
    this.emit({ type: 'place', pos: { ...pos } });
    return t;
  }

  upgradePrice(t: Tower, path: 0 | 1): number | null {
    const base = nextUpgradeBaseCost(t, path);
    return base === null ? null : priceFor(base, this.difficulty);
  }

  upgradeTower(t: Tower, path: 0 | 1): boolean {
    const price = this.upgradePrice(t, path);
    if (price === null || this.money < price) return false;
    this.money -= price;
    applyUpgrade(t, path, price);
    if (t.def.kind === 'trap') t.trapSpots = computeTrapSpots(t, this.paths);
    this.emit({ type: 'upgrade', pos: { ...t.pos } });
    return true;
  }

  sellTower(t: Tower): number {
    const i = this.towers.indexOf(t);
    if (i < 0) return 0;
    const value = towerSellValue(t);
    this.towers.splice(i, 1);
    this.money += value;
    for (const trap of this.traps) if (trap.ownerUid === t.uid) trap.alive = false;
    this.traps = this.traps.filter((tr) => tr.alive);
    this.emit({ type: 'sell', pos: { ...t.pos }, amount: value });
    return value;
  }

  cycleTargetMode(t: Tower): void {
    const i = TARGET_MODES.indexOf(t.targetMode);
    t.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length]!;
  }

  collectCookie(id: number): boolean {
    const i = this.cookies.findIndex((c) => c.id === id);
    if (i < 0) return false;
    const c = this.cookies[i]!;
    this.cookies.splice(i, 1);
    this.money += c.value;
    this.emit({ type: 'money', pos: { ...c.pos }, amount: c.value });
    return true;
  }

  // ----------------------------------------------------------------- step

  step(dt: number): void {
    if (this.phase === 'lost') return;
    this.time += dt;
    if (this.phase === 'wave' && this.spawner) {
      for (const id of this.spawner.update(dt)) this.spawn(id);
    }
    this.updateAuras();
    for (const t of this.towers) this.updateTower(t, dt);
    this.updateProjectiles(dt);
    this.updateTraps(dt);
    this.updateEnemies(dt);
    this.updateCookies(dt);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.traps = this.traps.filter((t) => t.alive);
    this.checkWaveEnd();
  }

  private updateAuras(): void {
    for (const t of this.towers) t.cdMult = 1;
    for (const src of this.towers) {
      if (src.stats.auraCdMult >= 1) continue;
      for (const t of this.towers) {
        if (t !== src && dist(t.pos, src.pos) <= src.stats.auraRange) t.cdMult = Math.min(t.cdMult, src.stats.auraCdMult);
      }
    }
  }

  private updateTower(t: Tower, dt: number): void {
    t.attackAnim = Math.max(0, t.attackAnim - dt);
    const s = t.stats;
    const active = this.phase === 'wave';

    if (s.tsunamiInterval > 0 && active) {
      t.tsunamiTimer -= dt;
      if (t.tsunamiTimer <= 0) {
        t.tsunamiTimer += s.tsunamiInterval;
        this.tsunami(t);
      }
    }

    if (t.def.kind === 'income') {
      if (active) {
        t.cookieTimer -= dt;
        if (t.cookieTimer <= 0) {
          t.cookieTimer += s.cookieInterval;
          this.bakeCookie(t);
        }
      }
      return;
    }

    if (t.cooldown > 0) t.cooldown -= dt;
    if (t.cooldown > 0) return;
    if (this.attack(t)) {
      t.cooldown += s.cooldown * t.cdMult;
      t.attackAnim = 0.22;
      this.emit({ type: 'attack', tower: t.def.id, pos: { ...t.pos } });
    }
  }

  private face(t: Tower, at: Vec2): void {
    if (Math.abs(at.x - t.pos.x) > 2) t.facing = at.x < t.pos.x ? -1 : 1;
  }

  /** Where the enemy will be when a projectile of this speed reaches it. */
  private lead(e: Enemy, from: Vec2, speed: number): Vec2 {
    const time = dist(from, e.pos) / speed;
    return this.paths[e.pathIndex]!.pointAt(e.dist + currentSpeed(e) * time);
  }

  private attack(t: Tower): boolean {
    const s = t.stats;
    switch (t.def.kind) {
      case 'projectile': {
        const target = pickTarget(t, this.enemies, this.paths);
        if (!target) return false;
        const aim = this.lead(target, t.pos, s.projectileSpeed);
        this.face(t, aim);
        this.fanOut(t, aim, 'bone');
        return true;
      }
      case 'bomb': {
        const target = pickTarget(t, this.enemies, this.paths);
        if (!target) return false;
        const aim = this.lead(target, t.pos, s.projectileSpeed);
        this.face(t, aim);
        this.fanOut(t, aim, 'bomb');
        return true;
      }
      case 'hitscan': {
        const target = pickTarget(t, this.enemies, this.paths);
        if (!target) return false;
        this.face(t, target.pos);
        this.emit({ type: 'hitscan', from: { ...t.pos }, to: { ...target.pos } });
        if (this.hit(target, s.damage, s.damageType, s.armorPierce, t)) applyStun(target, s.stun);
        return true;
      }
      case 'pulse': {
        const targets = enemiesInRadius(this.enemies, t.pos, s.range);
        if (targets.length === 0) return false;
        this.emit({ type: 'bark', pos: { ...t.pos }, radius: s.range });
        for (const e of targets) this.applyHit(e, s, t);
        return true;
      }
      case 'chain': {
        const water = (e: Enemy) => !e.def.waterImmune;
        const target = pickTarget(t, this.enemies, this.paths, water);
        if (!target) return false;
        this.face(t, target.pos);
        const chain = chainTargets(target, this.enemies, s.chain, s.chainRange, water);
        this.emit({ type: 'chain', points: [{ ...t.pos }, ...chain.map((e) => ({ ...e.pos }))] });
        for (const e of chain) this.applyHit(e, s, t);
        return true;
      }
      case 'trap': {
        if (this.phase !== 'wave' || t.trapSpots.length === 0) return false;
        const owned = this.traps.filter((tr) => tr.ownerUid === t.uid).length;
        if (owned >= s.maxTraps) return false;
        const spot = this.rng.pick(t.trapSpots);
        const path = this.paths[spot.pathIndex]!;
        const base = path.pointAt(spot.d);
        const dir = path.dirAt(spot.d);
        const off = this.rng.range(-8, 8);
        const pos = { x: base.x - dir.y * off, y: base.y + dir.x * off };
        this.face(t, pos);
        this.traps.push({
          id: this.nextId(),
          pos,
          damage: s.damage,
          pierce: s.pierce,
          damageType: s.damageType,
          armorPierce: s.armorPierce,
          slow: s.slow,
          instakillSmall: s.instakillSmall,
          life: s.trapLife,
          ownerUid: t.uid,
          alive: true,
          variant: s.damageType === 'explosive' ? 'mine' : s.slow ? 'glue' : 'bone',
        });
        this.emit({ type: 'trap', pos: { ...pos } });
        return true;
      }
      case 'income':
        return false;
    }
  }

  private fanOut(t: Tower, aim: Vec2, kind: ProjectileKind): void {
    const s = t.stats;
    const base = Math.atan2(aim.y - t.pos.y, aim.x - t.pos.x);
    const travel = dist(aim, t.pos);
    for (let i = 0; i < s.projectiles; i++) {
      const a = base + (i - (s.projectiles - 1) / 2) * s.spread;
      const vel = { x: Math.cos(a) * s.projectileSpeed, y: Math.sin(a) * s.projectileSpeed };
      const life = kind === 'bomb' ? travel / s.projectileSpeed + 0.05 : s.boomerang ? 10 : (s.range * 1.3) / s.projectileSpeed;
      this.projectiles.push({
        id: this.nextId(),
        kind,
        pos: { ...t.pos },
        vel,
        damage: s.damage,
        pierce: s.pierce,
        damageType: s.damageType,
        armorPierce: s.armorPierce,
        life,
        radius: kind === 'bomb' ? 6 : 5,
        splash: s.splash,
        shrapnel: s.shrapnel,
        stun: s.stun,
        slow: s.slow,
        ownerUid: t.uid,
        boomerang: s.boomerang ? { origin: { ...t.pos }, maxDist: s.range * 1.1, traveled: 0, returning: false } : null,
        spin: 0,
        alive: true,
      });
    }
  }

  private applyHit(e: Enemy, s: TowerStats, owner: Tower): void {
    if (!e.alive) return;
    if (this.hit(e, s.damage, s.damageType, s.armorPierce, owner)) {
      if (e.alive) {
        if (s.slow) applySlow(e, s.slow);
        applyStun(e, s.stun);
      }
    } else if (s.slow && s.damageType === 'sound') {
      // Barking still scares armored vacuums.
      applySlow(e, s.slow);
    }
  }

  /** Damage an enemy and handle rewards and children. Returns false if the damage was blocked. */
  private hit(e: Enemy, amount: number, type: DamageType, armorPierce: boolean, owner: Tower | null): boolean {
    const r = damageEnemy(e, amount, type, armorPierce, this.paths[e.pathIndex]!, this.factory);
    if (!r.dealt) {
      if (this.time - this.lastClank > 0.06) {
        this.lastClank = this.time;
        this.emit({ type: 'clank', pos: { ...e.pos } });
      }
      return false;
    }
    for (const k of r.killed) {
      this.money += k.def.reward;
      this.stats.pops++;
      if (owner) owner.pops++;
      this.emit({ type: 'pop', pos: { ...k.pos }, enemy: k.def.id });
    }
    for (const c of r.spawned) this.enemies.push(c);
    return true;
  }

  /** Remove an enemy with everything inside it (Zapadnia). */
  private obliterate(e: Enemy, owner: Tower | null): void {
    e.alive = false;
    this.money += familyReward(e.def.id);
    this.stats.pops++;
    if (owner) owner.pops++;
    this.emit({ type: 'pop', pos: { ...e.pos }, enemy: e.def.id });
  }

  private owner(uid: number): Tower | null {
    return this.towers.find((t) => t.uid === uid) ?? null;
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      if (p.boomerang) {
        const b = p.boomerang;
        const speed = len(p.vel);
        b.traveled += speed * dt;
        if (!b.returning && b.traveled >= b.maxDist) {
          b.returning = true;
          // A fresh id lets the bone hit the same vacuums again on the way back.
          p.id = this.nextId();
        }
        if (b.returning) {
          const to = sub(b.origin, p.pos);
          const l = len(to);
          if (l < speed * dt + 4) {
            p.alive = false;
            continue;
          }
          p.vel = scale(to, speed / l);
        }
      }
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.life -= dt;
      p.spin += dt * 14;

      const owner = this.owner(p.ownerUid);
      const n = this.enemies.length;
      for (let i = 0; i < n && p.alive; i++) {
        const e = this.enemies[i]!;
        if (!e.alive || e.hitBy.has(p.id) || !touches(p.pos, p.radius, e)) continue;
        if (p.kind === 'bomb') {
          this.explode(p, owner);
          p.alive = false;
          break;
        }
        e.hitBy.add(p.id);
        if (this.hit(e, p.damage, p.damageType, p.armorPierce, owner) && e.alive) {
          applyStun(e, p.stun);
          if (p.slow) applySlow(e, p.slow);
        }
        p.pierce--;
        if (p.pierce <= 0) p.alive = false;
      }
      if (p.alive && p.life <= 0) {
        if (p.kind === 'bomb') this.explode(p, owner);
        p.alive = false;
      }
      if (p.alive && (p.pos.x < -60 || p.pos.y < -60 || p.pos.x > FIELD_W + 60 || p.pos.y > FIELD_H + 60)) p.alive = false;
    }
  }

  private explode(p: Projectile, owner: Tower | null): void {
    this.emit({ type: 'explosion', pos: { ...p.pos }, radius: p.splash });
    for (const e of enemiesInRadius(this.enemies, p.pos, p.splash)) {
      if (this.hit(e, p.damage, p.damageType, p.armorPierce, owner) && e.alive) applyStun(e, p.stun);
    }
    for (let k = 0; k < p.shrapnel; k++) {
      const a = (Math.PI * 2 * k) / p.shrapnel;
      this.projectiles.push({
        id: this.nextId(),
        kind: 'shrapnel',
        pos: { ...p.pos },
        vel: { x: Math.cos(a) * 420, y: Math.sin(a) * 420 },
        damage: 1,
        pierce: 2,
        damageType: 'sharp',
        armorPierce: false,
        life: 0.3,
        radius: 4,
        splash: 0,
        shrapnel: 0,
        stun: 0,
        slow: null,
        ownerUid: p.ownerUid,
        boomerang: null,
        spin: a,
        alive: true,
      });
    }
  }

  private updateTraps(dt: number): void {
    for (const trap of this.traps) {
      if (!trap.alive) continue;
      if (this.phase === 'wave') trap.life -= dt;
      if (trap.life <= 0) {
        trap.alive = false;
        continue;
      }
      const owner = this.owner(trap.ownerUid);
      const n = this.enemies.length;
      for (let i = 0; i < n && trap.alive; i++) {
        const e = this.enemies[i]!;
        if (!e.alive || e.hitBy.has(trap.id) || !touches(trap.pos, TRAP_RADIUS, e)) continue;
        e.hitBy.add(trap.id);
        if (trap.instakillSmall && e.maxHp <= 6 && !e.def.armored && !e.def.boss) {
          this.obliterate(e, owner);
        } else if (this.hit(e, trap.damage, trap.damageType, trap.armorPierce, owner) && e.alive && trap.slow) {
          applySlow(e, trap.slow);
        }
        trap.pierce--;
        if (trap.pierce <= 0) trap.alive = false;
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (!moveEnemy(e, this.paths[e.pathIndex]!, dt)) continue;
      e.alive = false;
      const amount = leakValue(e);
      this.lives -= amount;
      this.stats.leaked += amount;
      this.emit({ type: 'leak', pos: { ...e.pos }, amount });
      if (this.lives <= 0 && this.phase !== 'lost') {
        this.lives = 0;
        this.phase = 'lost';
        this.emit({ type: 'lost' });
      }
    }
  }

  private tsunami(t: Tower): void {
    this.emit({ type: 'tsunami' });
    for (const e of [...this.enemies]) {
      if (e.alive && !e.def.waterImmune) this.hit(e, t.stats.tsunamiDamage, 'water', true, t);
    }
  }

  private bakeCookie(t: Tower): void {
    const a = this.rng.range(0, Math.PI * 2);
    const r = this.rng.range(18, 34);
    this.cookies.push({
      id: this.nextId(),
      pos: { x: t.pos.x + Math.cos(a) * r, y: t.pos.y + Math.sin(a) * r },
      value: t.stats.cookieValue,
      ttl: COOKIE_TTL,
      ownerUid: t.uid,
    });
    t.attackAnim = 0.3;
  }

  private updateCookies(dt: number): void {
    for (const c of [...this.cookies]) {
      c.ttl -= dt;
      if (c.ttl <= 0) this.collectCookie(c.id);
    }
  }

  private checkWaveEnd(): void {
    if (this.phase !== 'wave' || !this.spawner?.done || this.enemies.length > 0) return;
    for (const c of [...this.cookies]) this.collectCookie(c.id);
    let bonus = waveBonus(this.wave);
    for (const t of this.towers) bonus += t.stats.waveBonus;
    this.money += bonus;
    for (const t of this.towers) {
      const extra = interest(this.money, t.stats.interestRate, t.stats.interestCap);
      this.money += extra;
      bonus += extra;
    }
    this.spawner = null;
    this.emit({ type: 'waveEnd', wave: this.wave, bonus });
    if (this.wave >= WAVES.length && !this.endless) {
      this.phase = 'won';
      this.emit({ type: 'won' });
    } else {
      this.phase = 'idle';
    }
  }
}
