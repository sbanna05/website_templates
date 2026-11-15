import { describe, expect, it } from 'vitest';
import { createMotion, fitFor } from '../config/defaults';
import { normalizeProject } from '../persistence/schema';
import type { Project } from '../types/project';
import { MOTIONS, layerProgress, motionPose, pointOnPath, simplifyPath } from './motion';

const size = { pw: 2000, ph: 1000, W: 1080, H: 1920 };

describe('motion amounts', () => {
  it('pans by a share of the picture, not the frame, and never zooms', () => {
    const start = MOTIONS['pan-right'](0, 0.5, size.pw, size.ph, 0);
    const end = MOTIONS['pan-right'](1, 0.5, size.pw, size.ph, 0);
    expect((end.dx ?? 0) - (start.dx ?? 0)).toBeCloseTo(1000);
    expect(end.scale).toBeUndefined();
  });

  it('only zoom moves change the size', () => {
    for (const type of ['pan-left', 'turn-left', 'swing', 'spiral', 'handheld', 'drift'] as const) {
      expect(MOTIONS[type](0.7, 1, size.pw, size.ph, 1).scale).toBeUndefined();
    }
    expect(MOTIONS['zoom-in'](1, 0.3, size.pw, size.ph, 0).scale).toBeCloseTo(1.3);
  });
});

describe('motion stack', () => {
  it('plays each move in its own window and holds outside it', () => {
    const layer = createMotion('zoom-in', { curve: 'linear', from: 0.5, to: 1 });
    expect(layerProgress(layer, 1, 4, 0, [])).toBe(0);
    expect(layerProgress(layer, 3, 4, 0, [])).toBeCloseTo(0.5);
    expect(layerProgress(layer, 4, 4, 0, [])).toBeCloseTo(1);
  });

  it('repeats, optionally back and forth', () => {
    const loop = createMotion('pan-left', { curve: 'linear', repeat: 2 });
    expect(layerProgress(loop, 1.5, 4, 0, [])).toBeCloseTo(0.75);
    expect(layerProgress(loop, 2.5, 4, 0, [])).toBeCloseTo(0.25);
    const yoyo = { ...loop, yoyo: true };
    expect(layerProgress(yoyo, 2.5, 4, 0, [])).toBeCloseTo(0.75);
  });

  it('stacks moves: a zoom and a pan add up', () => {
    const poses = motionPose(
      [createMotion('zoom-in', { amount: 0.2, curve: 'linear' }), createMotion('pan-right', { amount: 0.1, curve: 'linear' })],
      4,
      4,
      0,
      [],
      size,
      0,
    );
    expect(poses[0].scale).toBeCloseTo(1.2);
    expect(poses[1].dx).toBeCloseTo(100);
  });
});

describe('drawn paths', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 0.2, y: 0 },
    { x: 0.2, y: 0.2 },
  ];

  it('starts and ends on the drawn points', () => {
    expect(pointOnPath(path, 0)).toEqual({ x: 0, y: 0 });
    const end = pointOnPath(path, 1);
    expect(end.x).toBeCloseTo(0.2);
    expect(end.y).toBeCloseTo(0.2);
  });

  it('moves the picture in frame units, scaled by the path size', () => {
    const [pose] = motionPose([createMotion('path', { path, amount: 0.5, curve: 'linear' })], 2, 2, 0, [], size, 0);
    expect(pose.dx).toBeCloseTo(0.1 * size.W);
    expect(pose.dy).toBeCloseTo(0.1 * size.H);
  });

  it('simplifies a freehand stroke to its corners', () => {
    const stroke = Array.from({ length: 21 }, (_, i) => (i <= 10 ? { x: i / 10, y: 0 } : { x: 1, y: (i - 10) / 10 }));
    expect(simplifyPath(stroke)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
  });
});

describe('picture fit', () => {
  it('shows a wide photo whole (over blur) in a tall frame', () => {
    expect(fitFor({ width: 2816, height: 1536 }, 9 / 16)).toBe('blur');
    expect(fitFor({ width: 1080, height: 1920 }, 9 / 16)).toBe('cover');
    expect(fitFor({ width: 1080, height: 1350 }, 9 / 16)).toBe('cover');
  });
});

describe('older saves', () => {
  it('turn the single motion into a one-move stack and fill in light options', () => {
    const legacy = {
      clips: [
        {
          id: 'c',
          kind: 'visual',
          trackId: 't',
          start: 0,
          duration: 3,
          motion: 'pan-left',
          motionAmount: 0.3,
          motionCurve: 'linear',
          lights: [{ id: 'l', type: 'glow', x: 0.5, y: 0.5, size: 0.5, intensity: 0.5, color: '#f2e6d4', angle: 0, pulseOnBeat: false }],
        },
      ],
    } as unknown as Partial<Project>;
    const clip = normalizeProject(legacy).clips[0];
    if (clip.kind !== 'visual') throw new Error('expected a visual clip');
    expect(clip.motions).toHaveLength(1);
    expect(clip.motions[0]).toMatchObject({ type: 'pan-left', amount: 0.3, curve: 'linear', from: 0, to: 1 });
    expect('motion' in clip).toBe(false);
    expect(clip.lights[0]).toMatchObject({ softness: 0.5, stretch: 1, blend: 'auto', animation: 'none', color: '#ffffff' });
  });
});
