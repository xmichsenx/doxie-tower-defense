import { FIELD_H, FIELD_W, type Vec2 } from '../core/types';

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** How far above a finger the placement ghost floats, in CSS px, so the finger doesn't hide it. */
export const TOUCH_LIFT_PX = 56;

/** Size of the desktop layout in CSS px (canvas + side panel). */
export const WIDE_APP_W = 1250;
export const WIDE_APP_H = 640;

export type Layout = 'wide' | 'portrait';

/** Portrait phones get a stacked layout; everything else scales the desktop layout. */
export function chooseLayout(width: number, height: number): Layout {
  return width < height && width < 900 ? 'portrait' : 'wide';
}

/** Scale that fits the desktop layout in the window. */
export function wideScale(width: number, height: number): number {
  return Math.max(0.3, Math.min(width / WIDE_APP_W, height / WIDE_APP_H, 2) * 0.98);
}

/** Convert a screen point to field coordinates, optionally lifted above the finger. */
export function toFieldPoint(clientX: number, clientY: number, rect: RectLike, liftPx = 0): Vec2 {
  return {
    x: ((clientX - rect.left) / rect.width) * FIELD_W,
    y: ((clientY - liftPx - rect.top) / rect.height) * FIELD_H,
  };
}

export function insideField(p: Vec2): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= FIELD_W && p.y <= FIELD_H;
}

/** True on phones and tablets, where hints should talk about dragging instead of keys. */
export function prefersTouch(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
