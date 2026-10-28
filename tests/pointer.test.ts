import { describe, expect, it } from 'vitest';
import { FIELD_H, FIELD_W } from '../src/core/types';
import { TOUCH_LIFT_PX, chooseLayout, insideField, toFieldPoint, wideScale } from '../src/ui/pointer';

describe('pointer helpers', () => {
  it('maps screen points onto the field regardless of the canvas display size', () => {
    // A phone shows the 960×640 field at 375×250 CSS px, 100 px from the top.
    const rect = { left: 0, top: 100, width: 375, height: 250 };
    expect(toFieldPoint(0, 100, rect)).toEqual({ x: 0, y: 0 });
    expect(toFieldPoint(375, 350, rect)).toEqual({ x: FIELD_W, y: FIELD_H });
    const mid = toFieldPoint(187.5, 225, rect);
    expect(mid.x).toBeCloseTo(FIELD_W / 2);
    expect(mid.y).toBeCloseTo(FIELD_H / 2);
  });

  it('lifts the touch point above the finger by a fixed number of CSS pixels', () => {
    const rect = { left: 0, top: 0, width: 480, height: 320 }; // half scale
    const plain = toFieldPoint(240, 200, rect);
    const lifted = toFieldPoint(240, 200, rect, TOUCH_LIFT_PX);
    expect(lifted.x).toBe(plain.x);
    expect(plain.y - lifted.y).toBeCloseTo(TOUCH_LIFT_PX * 2);
  });

  it('knows when a point is on the field', () => {
    expect(insideField({ x: 10, y: 10 })).toBe(true);
    expect(insideField({ x: -1, y: 10 })).toBe(false);
    expect(insideField({ x: 10, y: FIELD_H + 1 })).toBe(false);
  });

  it('uses the stacked layout only on portrait phone screens', () => {
    expect(chooseLayout(375, 812)).toBe('portrait');
    expect(chooseLayout(812, 375)).toBe('wide'); // landscape phone
    expect(chooseLayout(1024, 1366)).toBe('wide'); // portrait tablet is wide enough to scale
    expect(chooseLayout(1920, 1080)).toBe('wide');
  });

  it('scales the desktop layout to fit, within limits', () => {
    expect(wideScale(1250, 640)).toBeCloseTo(0.98);
    expect(wideScale(812, 375)).toBeCloseTo((375 / 640) * 0.98);
    expect(wideScale(5000, 5000)).toBeCloseTo(1.96);
    expect(wideScale(100, 100)).toBe(0.3);
  });
});
