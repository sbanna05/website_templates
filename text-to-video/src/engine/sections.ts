import { SPEED_RANGE } from '../config/options';
import { clamp } from '../lib/math';
import type { Asset, AudioClip, Project } from '../types/project';
import { octaveTarget } from './beatMatch';
import { clipEnd } from './timeline';

/*
 * Main beat + sections — the producer workflow.
 *
 * One song (often an instrumental / "type beat") is the *main beat*: its grid is
 * the clock everything else follows. From any other song you pick a *section*
 * (say, the chorus vocals), and it is dropped onto the main beat: re-timed to the
 * main tempo and started exactly on a bar line, so it plays "on the same beat".
 */

export const BEATS_PER_BAR = 4;

/** The clip whose beats drive the grid (the first unmuted beat source), optionally ignoring one clip. */
export function mainBeatClip(project: Project, assets: Record<string, Asset>, excludeId?: string): AudioClip | undefined {
  const muted = new Set(project.tracks.filter((t) => t.muted).map((t) => t.id));
  return project.clips
    .filter((c): c is AudioClip => c.kind === 'audio' && c.beatSource && c.id !== excludeId && !muted.has(c.trackId))
    .filter((c) => (assets[c.assetId]?.beats?.beats.length ?? 0) > 1)
    .sort((a, b) => a.start - b.start)[0];
}

/** Tempo a clip plays at (detected BPM × speed). */
export const playedBpm = (clip: AudioClip, asset: Asset | undefined): number => (asset?.beats?.bpm ?? 0) * clip.speed;

/** Bar starts of a song in source seconds: every `BEATS_PER_BAR`-th beat, counted from the downbeat. */
export const sourceBars = (asset: Asset | undefined): number[] => {
  const firstBar = asset?.beats?.firstBar ?? 0;
  return (asset?.beats?.beats ?? []).filter((_, i) => (i - firstBar + BEATS_PER_BAR) % BEATS_PER_BAR === 0);
};

/** Bar lines of a placed clip in timeline seconds, extrapolated past its end so later sections still land on bars. */
export function timelineBars(clip: AudioClip, asset: Asset | undefined, until: number): number[] {
  const toTimeline = (s: number) => clip.start + (s + clip.beatOffset - clip.inPoint) / clip.speed;
  const bars = sourceBars(asset)
    .map(toTimeline)
    .filter((t) => t >= clip.start - 1e-6 && t < clipEnd(clip));
  if (bars.length < 2) return bars;
  const period = (bars[bars.length - 1] - bars[0]) / (bars.length - 1);
  for (let t = bars[bars.length - 1] + period; t <= until + period; t += period) bars.push(t);
  return bars;
}

/** Bar lines (downbeats) of the main beat on the timeline — what the grid draws strong and "sync on bar" uses. */
export function timelineDownbeats(project: Project, assets: Record<string, Asset>): number[] {
  const main = mainBeatClip(project, assets);
  if (!main) return [];
  const end = clipEnd(main);
  return timelineBars(main, assets[main.assetId], end).filter((t) => t < end - 1e-6);
}

/** Snaps a source time to the nearest beat (or bar) of the song. */
export function snapToGrid(time: number, grid: readonly number[]): number {
  let best = time;
  let distance = Number.POSITIVE_INFINITY;
  for (const t of grid) {
    const d = Math.abs(t - time);
    if (d < distance) {
      best = t;
      distance = d;
    }
  }
  return best;
}

export interface SectionRequest {
  from: number;
  to: number;
  /** Earliest timeline time the section may start at (e.g. the playhead). */
  at: number;
  trackId: string;
  /** Re-time the section to the main beat's tempo. */
  matchTempo: boolean;
}

/**
 * Builds a new clip that plays `from…to` of `source`'s song, re-timed to the main
 * beat and starting on its first bar line at or after `at`. Pitch, effects and
 * volume keys carry over; the new clip never drives the grid itself.
 */
export function placeSection(project: Project, assets: Record<string, Asset>, source: AudioClip, request: SectionRequest, id: string): AudioClip {
  const asset = assets[source.assetId];
  const main = mainBeatClip(project, assets, source.id);
  const songBpm = asset?.beats?.bpm ?? 0;

  let speed = source.speed;
  let start = Math.max(0, request.at);
  if (main) {
    const mainAsset = assets[main.assetId];
    const target = playedBpm(main, mainAsset);
    if (request.matchTempo && songBpm > 0 && target > 0) {
      speed = clamp(octaveTarget(songBpm, target) / songBpm, SPEED_RANGE.min, SPEED_RANGE.max);
      speed = Number(speed.toFixed(4));
    }
    const bars = timelineBars(main, mainAsset, request.at + 60);
    start = bars.find((t) => t >= request.at - 0.05) ?? start;
  }

  const length = Math.max(0.1, request.to - request.from);
  return {
    ...source,
    id,
    trackId: request.trackId,
    start,
    inPoint: request.from,
    speed,
    duration: length / speed,
    fadeIn: 0.02,
    fadeOut: Math.min(0.25, source.fadeOut),
    beatSource: false,
    beatOffset: 0,
    volumeKeys: source.volumeKeys.filter((k) => k.time >= request.from && k.time <= request.to),
  };
}
