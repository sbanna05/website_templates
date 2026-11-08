import { describe, expect, it } from 'vitest';
import { cropForRatio } from './crop';

describe('cropForRatio', () => {
  it('crops a landscape photo to 9:16 at full height, centred', () => {
    const crop = cropForRatio({ x: 0, y: 0, width: 1, height: 1 }, 9 / 16, 16 / 9);
    expect(crop.height).toBe(1);
    expect(crop.width).toBeCloseTo((9 / 16) / (16 / 9));
    expect(crop.x + crop.width / 2).toBeCloseTo(0.5);
  });

  it('keeps the crop inside the image when the centre is near an edge', () => {
    const crop = cropForRatio({ x: 0.9, y: 0, width: 0.1, height: 0.1 }, 1, 1);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1);
    expect(crop.y).toBeGreaterThanOrEqual(0);
  });
});
