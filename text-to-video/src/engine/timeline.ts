import { MIN_CLIP_DURATION, MIN_PROJECT_DURATION } from '../config/defaults';
import { clamp } from '../lib/math';
import { createId } from '../lib/id';
import type { Asset, Clip, MediaClip, Project, TextClip, Track } from '../types/project';

/* Pure timeline maths — no React, no DOM. Shared by the UI, preview and export. */

export const clipEnd = (clip: Clip): number => clip.start + clip.duration;

export const isClipActive = (clip: Clip, time: number): boolean =>
  time >= clip.start && time < clipEnd(clip);

export const isMediaClip = (clip: Clip): clip is MediaClip => clip.kind !== 'text';

export function projectDuration(project: Project): number {
  return Math.max(MIN_PROJECT_DURATION, ...project.clips.map(clipEnd));
}

/** Source-file time shown at timeline `time` for a media clip. */
export const sourceTimeAt = (clip: MediaClip, time: number): number =>
  clip.inPoint + (time - clip.start) * clip.speed;

/** Longest a media clip may be on the timeline given its source length. */
export function maxClipDuration(clip: Clip, asset: Asset | undefined): number {
  if (!isMediaClip(clip) || !asset || asset.kind === 'image') return Number.POSITIVE_INFINITY;
  return Math.max(MIN_CLIP_DURATION, (asset.duration - clip.inPoint) / clip.speed);
}

export function trackEnd(project: Project, trackId: string): number {
  return project.clips.filter((c) => c.trackId === trackId).reduce((end, c) => Math.max(end, clipEnd(c)), 0);
}

export const findTrack = (project: Project, trackId: string): Track | undefined =>
  project.tracks.find((t) => t.id === trackId);

/** Returns a copy of the clip with a new speed; timeline length scales so the same source span plays. */
export function withSpeed<T extends MediaClip>(clip: T, speed: number, asset: Asset | undefined): T {
  const next = { ...clip, speed, duration: (clip.duration * clip.speed) / speed };
  return { ...next, duration: Math.min(next.duration, maxClipDuration(next, asset)) };
}

/** Splits a clip at timeline `time`. Returns null when the cut would create a sliver. */
export function splitClip(clip: Clip, time: number): [Clip, Clip] | null {
  const offset = time - clip.start;
  if (offset < MIN_CLIP_DURATION || clip.duration - offset < MIN_CLIP_DURATION) return null;
  const left: Clip = { ...clip, duration: offset };
  const rest = { id: createId('clip'), start: time, duration: clip.duration - offset };
  const right: Clip = isMediaClip(clip)
    ? { ...clip, ...rest, inPoint: clip.inPoint + offset * clip.speed }
    : { ...clip, ...rest };
  return [left, right];
}

export interface TrimResult {
  start: number;
  duration: number;
  inPoint?: number;
}

/** Trims the left edge to `newStart`, keeping the right edge fixed and the media in place. */
export function trimStart(clip: Clip, newStart: number): TrimResult {
  const end = clipEnd(clip);
  let start = Math.min(newStart, end - MIN_CLIP_DURATION);
  if (isMediaClip(clip)) {
    // Can't reveal media before the file's first frame.
    start = Math.max(start, clip.start - clip.inPoint / clip.speed);
    return { start, duration: end - start, inPoint: clip.inPoint + (start - clip.start) * clip.speed };
  }
  start = Math.max(0, start);
  return { start, duration: end - start };
}

export function trimEnd(clip: Clip, newEnd: number, asset: Asset | undefined): TrimResult {
  const duration = clamp(newEnd - clip.start, MIN_CLIP_DURATION, maxClipDuration(clip, asset));
  return { start: clip.start, duration };
}

interface Span {
  start: number;
  end: number;
}

/**
 * Neighbouring pairs on one lane where the later span starts before the earlier
 * one ends *and plays on past it* — a DJ-style hand-over, which gets a crossfade.
 * A span sitting entirely inside a longer one is layered on top instead.
 * Shared by the mixer (fades) and the timeline (the drawn ✕ zones).
 */
export function handOvers<T extends Span>(spans: readonly T[]): [T, T][] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const pairs: [T, T][] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const earlier = sorted[i - 1];
    const later = sorted[i];
    if (later.start < earlier.end && later.end > earlier.end) pairs.push([earlier, later]);
  }
  return pairs;
}

/** Closest candidate within `threshold`, else the value itself. */
export function snapValue(value: number, candidates: readonly number[], threshold: number): number {
  let best = value;
  let bestDistance = threshold;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/** Every beat on the timeline: manual taps plus the detected grid of beat-source clips. */
export function timelineBeats(project: Project, assets: Record<string, Asset>): number[] {
  const mutedTracks = new Set(project.tracks.filter((t) => t.muted).map((t) => t.id));
  const beats = [...project.manualBeats];
  for (const clip of project.clips) {
    if (clip.kind !== 'audio' || !clip.beatSource || mutedTracks.has(clip.trackId)) continue;
    const grid = assets[clip.assetId]?.beats?.beats;
    if (!grid) continue;
    for (const sourceBeat of grid) {
      const time = clip.start + (sourceBeat + clip.beatOffset - clip.inPoint) / clip.speed;
      if (time >= clip.start && time < clipEnd(clip)) beats.push(time);
    }
  }
  return beats.sort((a, b) => a - b);
}

/**
 * Re-sequences every clip on a track so each cut lands on a beat — the core
 * of an "MVM"-style edit. Clips keep their order; each lasts `beatsPerClip` beats.
 * The edit starts on the beat nearest the track's first clip (so a sequence that
 * begins at the drop stays at the drop), or on the next bar line when `bars` are given.
 */
export function syncTrackToBeats(
  project: Project,
  assets: Record<string, Asset>,
  trackId: string,
  beats: readonly number[],
  beatsPerClip: number,
  options: { bars?: readonly number[] } = {},
): Clip[] {
  const trackClips = project.clips.filter((c) => c.trackId === trackId).sort((a, b) => a.start - b.start);
  if (trackClips.length === 0 || beats.length < 2) return project.clips;

  let beatIndex = nearestIndex(beats, trackClips[0].start);
  if (options.bars?.length) {
    const bar = options.bars.find((t) => t >= beats[beatIndex] - 0.01);
    if (bar !== undefined) beatIndex = nearestIndex(beats, bar);
  }
  const updated = new Map<string, Clip>();
  const lastGap = beats[beats.length - 1] - beats[beats.length - 2];
  // Past the last beat the grid carries on at the final tempo.
  const beatAt = (i: number) => beats[i] ?? beats[beats.length - 1] + (i - beats.length + 1) * lastGap;
  for (const clip of trackClips) {
    const startBeat = beatAt(beatIndex);
    const endIndex = beatIndex + beatsPerClip;
    const asset = isMediaClip(clip) ? assets[clip.assetId] : undefined;
    const duration = Math.min(beatAt(endIndex) - startBeat, maxClipDuration(clip, asset));
    updated.set(clip.id, { ...clip, start: startBeat, duration });
    beatIndex = endIndex;
  }
  return project.clips.map((c) => updated.get(c.id) ?? c);
}

/** Index of the value in a sorted list closest to `time`. */
function nearestIndex(sorted: readonly number[], time: number): number {
  let best = 0;
  for (let i = 1; i < sorted.length; i += 1) if (Math.abs(sorted[i] - time) < Math.abs(sorted[best] - time)) best = i;
  return best;
}

/** Clips that render at `time`, bottom layer first. The first track in the list is the top layer. */
export function activeClipsInRenderOrder(project: Project, time: number): Clip[] {
  const order = new Map(project.tracks.map((t, i) => [t.id, project.tracks.length - i]));
  const hidden = new Set(project.tracks.filter((t) => t.hidden).map((t) => t.id));
  return project.clips
    .filter((c) => !hidden.has(c.trackId) && c.kind !== 'audio' && isClipActive(c, time))
    .sort((a, b) => (order.get(a.trackId) ?? 0) - (order.get(b.trackId) ?? 0));
}

/**
 * Lyric-video style: breaks one text clip into a clip per word (or line),
 * each starting on the next beat and lasting `beatsPer` beats. Style and
 * animation carry over, so every piece animates in on its own beat.
 */
export function splitTextToBeats(
  clip: TextClip,
  beats: readonly number[],
  unit: 'word' | 'line',
  beatsPer: number,
): TextClip[] {
  const pieces =
    unit === 'line'
      ? clip.text.split('\n').map((l) => l.trim()).filter(Boolean)
      : clip.text.split(/\s+/).filter(Boolean);
  const upcoming = beats.filter((b) => b >= clip.start - 0.05);
  if (pieces.length < 2 || upcoming.length < 2) return [clip];
  const period = upcoming[upcoming.length - 1] - upcoming[upcoming.length - 2];
  const beatAt = (i: number) => upcoming[i] ?? upcoming[upcoming.length - 1] + (i - upcoming.length + 1) * period;
  return pieces.map((text, i) => {
    const start = beatAt(i * beatsPer);
    return {
      ...clip,
      id: i === 0 ? clip.id : createId('clip'),
      text,
      start,
      duration: Math.max(MIN_CLIP_DURATION, beatAt((i + 1) * beatsPer) - start),
      animation: { ...clip.animation, revealOnBeat: false },
    };
  });
}
