import type { AudioClip, Clip, MediaClip } from '../types/project';
import { clipEnd, isMediaClip } from './timeline';

/*
 * Joining cut parts back together.
 *
 * - Heal: parts that were split from the same stretch of the same file and still
 *   sit edge to edge become one clip again — lossless, nothing is rendered.
 * - Bounce: any other set of music parts is rendered into one new audio file
 *   (see `audio/bounce.ts`), either back to back or exactly as placed.
 */

export type MergeLayout = 'back-to-back' | 'as-placed';

const TOLERANCE = 0.01;

/** Settings that must match for two parts to become one clip without changing how either sounds or looks. */
function settingsOf(clip: MediaClip): string {
  const stripped: Record<string, unknown> = { ...clip };
  // Position fields differ by definition; edges and automation are merged separately below.
  const perPart = ['id', 'start', 'duration', 'inPoint', 'volumeKeys', 'fadeIn', 'fadeOut', 'transitionIn', 'transitionOut', 'beatSource', 'beatOffset'];
  for (const key of perPart) delete stripped[key];
  return JSON.stringify(stripped);
}

const byStart = <T extends Clip>(clips: readonly T[]): T[] => [...clips].sort((a, b) => a.start - b.start);

/** One clip covering all parts, or null when they can't be joined without rendering. */
export function healClips<T extends MediaClip>(clips: readonly T[]): T | null {
  if (clips.length < 2) return null;
  const sorted = byStart(clips);
  const first = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const before = sorted[i - 1];
    const part = sorted[i];
    const sameSource =
      part.kind === first.kind &&
      part.assetId === first.assetId &&
      part.trackId === first.trackId &&
      Math.abs(part.speed - first.speed) < 1e-6 &&
      part.pitch === first.pitch &&
      settingsOf(part) === settingsOf(first);
    const touches = Math.abs(part.start - clipEnd(before)) < TOLERANCE;
    const continues = Math.abs(part.inPoint - (before.inPoint + before.duration * before.speed)) < TOLERANCE * part.speed;
    if (!sameSource || !touches || !continues) return null;
  }
  const last = sorted[sorted.length - 1];
  const joined = { ...first, duration: clipEnd(last) - first.start };
  if (joined.kind === 'audio' && last.kind === 'audio') {
    const keys = sorted.flatMap((c) => (c as AudioClip).volumeKeys);
    return { ...joined, fadeOut: last.fadeOut, volumeKeys: [...new Map(keys.map((k) => [k.id, k])).values()] } as T;
  }
  if (joined.kind === 'visual' && last.kind === 'visual') return { ...joined, transitionOut: last.transitionOut } as T;
  return joined as T;
}

/** The parts lined up one after another from the first one's start, gaps removed. */
export function backToBack<T extends Clip>(clips: readonly T[]): T[] {
  const sorted = byStart(clips);
  let cursor = sorted[0]?.start ?? 0;
  return sorted.map((clip) => {
    const placed = { ...clip, start: cursor };
    cursor += clip.duration;
    return placed;
  });
}

/** Timeline span covered by the clips. */
export function spanOf(clips: readonly Clip[]): { start: number; end: number } {
  return {
    start: Math.min(...clips.map((c) => c.start)),
    end: Math.max(...clips.map(clipEnd)),
  };
}

/** Why a selection can't be merged, or null when it can. */
export function mergeBlocker(clips: readonly Clip[]): string | null {
  if (clips.length < 2) return 'Select two or more parts to merge';
  if (healClips(clips.filter(isMediaClip)) && clips.every(isMediaClip)) return null;
  if (clips.some((c) => c.kind !== 'audio'))
    return 'Only music parts can be rendered into one file — video parts join when they were split from one clip and still sit edge to edge with the same settings';
  return null;
}
