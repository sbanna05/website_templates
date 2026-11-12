import { describe, expect, it } from 'vitest';
import { frameSizeFor } from '../config/canvas';
import { EXPORT_FORMATS, formatsOfKind } from './formats';

describe('export formats', () => {
  it('has a unique extension per format and matches ids to keys', () => {
    const formats = Object.entries(EXPORT_FORMATS);
    for (const [id, info] of formats) expect(info.id).toBe(id);
    expect(new Set(formats.map(([, f]) => f.extension)).size).toBe(formats.length);
  });

  it('groups every format under exactly one kind', () => {
    const grouped = (['video', 'animation', 'audio', 'image'] as const).flatMap(formatsOfKind);
    expect(grouped).toHaveLength(Object.keys(EXPORT_FORMATS).length);
  });

  it('keeps the aspect ratio within one pixel at every export size', () => {
    for (const aspect of ['9:16', '16:9', '1:1', '4:5'] as const) {
      const [w, h] = aspect.split(':').map(Number);
      for (const shortSide of [320, 480, 720, 1080, 1440, 2160]) {
        const size = frameSizeFor(aspect, shortSide);
        expect(Math.min(size.width, size.height)).toBe(shortSide);
        expect(Math.abs(size.width - (size.height * w) / h)).toBeLessThanOrEqual(1);
      }
    }
  });
});
