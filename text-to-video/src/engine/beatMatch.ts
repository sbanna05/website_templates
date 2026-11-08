import { MIN_CLIP_DURATION } from '../config/defaults';
import { SPEED_RANGE } from '../config/options';
import { clamp } from '../lib/math';
import type { Asset, AudioClip, Clip, Project } from '../types/project';
import { clipEnd, maxClipDuration, withSpeed } from './timeline';

/*
 * Beat matching — make several songs with different tempos play on one grid.
 *
 *  follow-base  the chosen song keeps its tempo, every other song re-times to it
 *  meet         every song moves to a shared tempo in between (geometric mean)
 *  custom       every song moves to a tempo you type in
 *
 * Tempo changes go through `withSpeed`, so pitch, volume, fades and beat offset
 * are untouched (time-stretching preserves pitch). Songs are matched to the
 * nearest octave (½×, 1×, 2×) so a 70 BPM ballad pairs with a 140 BPM track
 * at a natural speed instead of being doubled.
 */

export type BeatMatchMode = 'follow-base' | 'meet' | 'custom';

export interface BeatMatchOptions {
  baseClipId: string;
  mode: BeatMatchMode;
  customBpm?: number;
  /** Shift songs slightly so their downbeats land on the base grid. */
  alignPhase: boolean;
  /** Move cuts/text that sat on a song's beat so they stay on that same beat. */
  keepEditsOnBeat: boolean;
}

export interface MatchCandidate {
  clip: AudioClip;
  /** Tempo as it currently plays (detected BPM × clip speed). */
  bpm: number;
}

/** Edges this close to a beat count as "on the beat". */
const ON_BEAT_TOLERANCE = 0.045;
const OCTAVES = [0.5, 1, 2] as const;

/** Music clips with a detected tempo, in timeline order. */
export function matchCandidates(project: Project, assets: Record<string, Asset>): MatchCandidate[] {
  return project.clips
    .filter((c): c is AudioClip => c.kind === 'audio')
    .map((clip) => ({ clip, bpm: (assets[clip.assetId]?.beats?.bpm ?? 0) * clip.speed }))
    .filter((c) => c.bpm > 0)
    .sort((a, b) => a.clip.start - b.clip.start);
}

/** Folds `bpm` by an octave so it lands as close to `target` as possible; returns the folded target. */
export function octaveTarget(bpm: number, target: number): number {
  return OCTAVES.map((k) => target * k).reduce((best, t) =>
    Math.abs(Math.log(t / bpm)) < Math.abs(Math.log(best / bpm)) ? t : best,
  );
}

export function targetBpm(candidates: readonly MatchCandidate[], options: BeatMatchOptions): number {
  const base = candidates.find((c) => c.clip.id === options.baseClipId) ?? candidates[0];
  if (!base) return 0;
  if (options.mode === 'custom' && options.customBpm && options.customBpm > 0) return options.customBpm;
  if (options.mode === 'follow-base') return base.bpm;
  // Meet in the middle: geometric mean of every tempo, each folded into the base's octave first.
  const folded = candidates.map((c) => octaveTarget(base.bpm, c.bpm));
  return Math.exp(folded.reduce((sum, bpm) => sum + Math.log(bpm), 0) / folded.length);
}

/** Timeline time of source beat `sourceBeat` for an audio clip. */
const beatTime = (clip: AudioClip, sourceBeat: number): number =>
  clip.start + (sourceBeat + clip.beatOffset - clip.inPoint) / clip.speed;

/** The clip's beats that fall inside it, as [sourceBeat, timelineTime] pairs. */
function clipBeats(clip: AudioClip, grid: readonly number[]): [number, number][] {
  return grid
    .map((b): [number, number] => [b, beatTime(clip, b)])
    .filter(([, t]) => t >= clip.start - 1e-6 && t < clipEnd(clip));
}

/** Nearest point of an (extrapolated) regular grid to `time`. */
function nearestOnGrid(anchor: number, period: number, time: number): number {
  return anchor + Math.round((time - anchor) / period) * period;
}

export interface BeatMatchResult {
  clips: Clip[];
  target: number;
  changed: number;
}

export function matchBeats(project: Project, assets: Record<string, Asset>, options: BeatMatchOptions): BeatMatchResult {
  const candidates = matchCandidates(project, assets);
  const target = targetBpm(candidates, options);
  if (candidates.length === 0 || target <= 0) return { clips: project.clips, target, changed: 0 };
  const baseId = candidates.some((c) => c.clip.id === options.baseClipId) ? options.baseClipId : candidates[0].clip.id;

  // 1. Re-time every song (the base too, unless it's the one being followed).
  const retimed = new Map<string, AudioClip>();
  for (const { clip, bpm } of candidates) {
    if (options.mode === 'follow-base' && clip.id === baseId) continue;
    const folded = octaveTarget(bpm, target);
    const speed = clamp(clip.speed * (folded / bpm), SPEED_RANGE.min, SPEED_RANGE.max);
    if (Math.abs(speed - clip.speed) < 1e-4) continue;
    retimed.set(clip.id, withSpeed(clip, Number(speed.toFixed(4)), assets[clip.assetId]));
  }

  // 2. Nudge each song so its first beat sits on the base song's grid.
  const resolve = (clip: AudioClip) => retimed.get(clip.id) ?? clip;
  const base = resolve(candidates.find((c) => c.clip.id === baseId)!.clip);
  const baseGrid = assets[base.assetId]?.beats?.beats ?? [];
  const baseFirst = clipBeats(base, baseGrid)[0];
  if (options.alignPhase && baseFirst) {
    const period = 60 / target;
    for (const { clip } of candidates) {
      if (clip.id === baseId) continue;
      const current = resolve(clip);
      const first = clipBeats(current, assets[clip.assetId]?.beats?.beats ?? [])[0];
      if (!first) continue;
      const delta = nearestOnGrid(baseFirst[1], period, first[1]) - first[1];
      if (Math.abs(delta) < 1e-3) continue;
      let start = current.start + delta;
      if (start < 0) start += period;
      retimed.set(clip.id, { ...current, start });
    }
  }

  // 3. A slowed-down song gets longer — stop it where the next song on its track begins,
  //    so two songs never play on top of each other.
  for (const [id, clip] of retimed) {
    const next = project.clips
      .filter((c) => c.kind === 'audio' && c.trackId === clip.trackId && c.id !== id)
      .map((c) => retimed.get(c.id) ?? (c as AudioClip))
      .filter((c) => c.start >= clip.start)
      .sort((a, b) => a.start - b.start)[0];
    if (next && clipEnd(clip) > next.start) {
      retimed.set(id, { ...clip, duration: Math.max(MIN_CLIP_DURATION, next.start - clip.start) });
    }
  }

  // 4. Carry cuts and text that sat on a song's beat along with that beat.
  const remapEdge = (time: number): number => {
    if (!options.keepEditsOnBeat) return time;
    for (const { clip: before } of candidates) {
      const after = retimed.get(before.id);
      if (!after || time < before.start - ON_BEAT_TOLERANCE || time > clipEnd(before) + ON_BEAT_TOLERANCE) continue;
      const grid = assets[before.assetId]?.beats?.beats ?? [];
      const hit = clipBeats(before, grid).find(([, t]) => Math.abs(t - time) <= ON_BEAT_TOLERANCE);
      if (hit) return beatTime(after, hit[0]);
    }
    return time;
  };

  const clips = project.clips.map((clip): Clip => {
    const audio = retimed.get(clip.id);
    if (audio) return audio;
    if (clip.kind === 'audio' || !options.keepEditsOnBeat) return clip;
    const start = Math.max(0, remapEdge(clip.start));
    const end = remapEdge(clipEnd(clip));
    if (start === clip.start && end === clipEnd(clip)) return clip;
    const limit = clip.kind === 'visual' ? maxClipDuration(clip, assets[clip.assetId]) : Number.POSITIVE_INFINITY;
    return { ...clip, start, duration: clamp(end - start, MIN_CLIP_DURATION, limit) };
  });

  return { clips, target, changed: retimed.size };
}
