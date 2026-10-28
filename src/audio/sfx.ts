export type SoundName =
  | 'bark'
  | 'throw'
  | 'sling'
  | 'zap'
  | 'pop'
  | 'clank'
  | 'boom'
  | 'coin'
  | 'leak'
  | 'wave'
  | 'waveEnd'
  | 'place'
  | 'sell'
  | 'upgrade'
  | 'win'
  | 'lose'
  | 'splash'
  | 'click'
  | 'error';

/** Minimum seconds between two plays of the same sound. */
const THROTTLE: Partial<Record<SoundName, number>> = { pop: 0.035, throw: 0.07, clank: 0.08, zap: 0.06, bark: 0.08, sling: 0.06, boom: 0.06, coin: 0.05 };

/** Tiny 8-bit style synthesizer on WebAudio. No sound files needed. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last = new Map<SoundName, number>();
  muted = false;

  /** Must be called from a user gesture before sounds can play. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, filter: number, type: BiquadFilterType = 'lowpass', delay = 0): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filter;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.02);
  }

  play(name: SoundName): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = THROTTLE[name] ?? 0.03;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, now);
    const r = 0.9 + Math.random() * 0.2;
    switch (name) {
      case 'bark':
        this.tone(520 * r, 0.09, 'square', 0.25, 230);
        this.tone(430 * r, 0.1, 'square', 0.2, 180, 0.1);
        this.noise(0.06, 0.15, 1800);
        break;
      case 'throw':
        this.noise(0.05, 0.08, 3000, 'highpass');
        break;
      case 'sling':
        this.tone(900 * r, 0.06, 'triangle', 0.2, 300);
        this.noise(0.04, 0.1, 2500, 'highpass');
        break;
      case 'zap':
        this.tone(300 * r, 0.12, 'sawtooth', 0.12, 900);
        this.noise(0.08, 0.1, 4000, 'highpass');
        break;
      case 'pop':
        this.noise(0.05, 0.2, 1500 * r, 'bandpass');
        this.tone(700 * r, 0.06, 'square', 0.12, 160);
        break;
      case 'clank':
        this.tone(1500 * r, 0.06, 'triangle', 0.18);
        this.tone(950 * r, 0.05, 'square', 0.07);
        break;
      case 'boom':
        this.noise(0.35, 0.4, 500);
        this.tone(130, 0.3, 'sine', 0.35, 40);
        break;
      case 'coin':
        this.tone(988, 0.06, 'square', 0.12);
        this.tone(1318, 0.12, 'square', 0.12, undefined, 0.06);
        break;
      case 'leak':
        this.tone(180, 0.28, 'square', 0.22, 70);
        this.noise(0.3, 0.12, 400);
        break;
      case 'wave':
        this.tone(440, 0.1, 'triangle', 0.25);
        this.tone(660, 0.18, 'triangle', 0.25, undefined, 0.1);
        break;
      case 'waveEnd':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, i * 0.08));
        break;
      case 'place':
        this.tone(520, 0.08, 'triangle', 0.25, 780);
        this.noise(0.08, 0.1, 800);
        break;
      case 'sell':
        this.tone(660, 0.12, 'triangle', 0.2, 330);
        break;
      case 'upgrade':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'square', 0.13, undefined, i * 0.06));
        break;
      case 'win':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'square', 0.14, undefined, i * 0.14));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.25, undefined, i * 0.2));
        break;
      case 'splash':
        this.noise(0.8, 0.3, 900);
        break;
      case 'click':
        this.tone(800, 0.03, 'square', 0.08);
        break;
      case 'error':
        this.tone(160, 0.12, 'square', 0.15);
        break;
    }
  }
}
