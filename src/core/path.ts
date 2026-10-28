import { distToSegment, normalize } from './math';
import type { Vec2 } from './types';

/** A polyline enemies travel along, addressed by distance travelled. */
export class Path {
  readonly points: readonly Vec2[];
  readonly length: number;
  /** cum[i] = distance from start to points[i]. */
  private readonly cum: number[];

  constructor(points: readonly Vec2[]) {
    if (points.length < 2) throw new Error('Path needs at least 2 points');
    this.points = points.map((p) => ({ x: p.x, y: p.y }));
    this.cum = [0];
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      total += Math.hypot(b.x - a.x, b.y - a.y);
      this.cum.push(total);
    }
    this.length = total;
  }

  /** Index of the segment containing distance d (segment i goes from points[i] to points[i+1]). */
  private segmentAt(d: number): number {
    let lo = 0;
    let hi = this.points.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid]! <= d) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  pointAt(d: number): Vec2 {
    if (d <= 0) return { ...this.points[0]! };
    if (d >= this.length) return { ...this.points[this.points.length - 1]! };
    const i = this.segmentAt(d);
    const a = this.points[i]!;
    const b = this.points[i + 1]!;
    const segLen = this.cum[i + 1]! - this.cum[i]!;
    const t = segLen === 0 ? 0 : (d - this.cum[i]!) / segLen;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /** Unit direction of travel at distance d. */
  dirAt(d: number): Vec2 {
    const i = this.segmentAt(Math.min(Math.max(d, 0), this.length));
    const a = this.points[i]!;
    const b = this.points[i + 1]!;
    return normalize({ x: b.x - a.x, y: b.y - a.y });
  }

  distanceTo(p: Vec2): number {
    let best = Infinity;
    for (let i = 0; i < this.points.length - 1; i++) {
      best = Math.min(best, distToSegment(p, this.points[i]!, this.points[i + 1]!));
    }
    return best;
  }

  /** Evenly spaced samples along the path. */
  sample(step: number): { d: number; p: Vec2 }[] {
    const out: { d: number; p: Vec2 }[] = [];
    for (let d = 0; d <= this.length; d += step) out.push({ d, p: this.pointAt(d) });
    return out;
  }
}
