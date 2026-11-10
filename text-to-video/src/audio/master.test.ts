import { describe, expect, it } from 'vitest';
import { softClip } from './master';

describe('safety clipper', () => {
  it('leaves normal levels untouched', () => {
    for (const x of [0, 0.1, -0.5, 0.79]) expect(softClip(x)).toBe(x);
  });

  it('never lets a peak reach full scale, however loud the mix', () => {
    for (const x of [1, 1.5, 2, 4, -3]) expect(Math.abs(softClip(x))).toBeLessThan(1);
  });

  it('is smooth and keeps rising past the knee (no hard edge that crackles)', () => {
    const a = softClip(0.85);
    const b = softClip(0.9);
    expect(b).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(0.8);
  });
});
