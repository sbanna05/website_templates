import { clipEnd } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { audioBufferCache } from './audioBufferCache';

/** One sound-producing span on the timeline, normalised across audio and video clips. */
export interface MixSource {
  assetId: string;
  speed: number;
  pitch: number;
  start: number;
  end: number;
  /** Seconds into the *processed* buffer that line up with `start`. */
  offset: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

/** Tiny fade on every edge so cuts never click. */
const DECLICK = 0.008;

export function collectMixSources(project: Project, assets: Record<string, Asset>): MixSource[] {
  const muted = new Set(project.tracks.filter((t) => t.muted).map((t) => t.id));
  const sources: MixSource[] = [];
  for (const clip of project.clips) {
    if (clip.kind === 'text' || muted.has(clip.trackId) || clip.volume <= 0) continue;
    if (clip.kind === 'visual' && !assets[clip.assetId]?.hasAudio) continue;
    sources.push({
      assetId: clip.assetId,
      speed: clip.speed,
      pitch: clip.pitch,
      start: clip.start,
      end: clipEnd(clip),
      offset: clip.inPoint / clip.speed,
      volume: clip.volume,
      fadeIn: clip.kind === 'audio' ? clip.fadeIn : 0,
      fadeOut: clip.kind === 'audio' ? clip.fadeOut : 0,
    });
  }
  return sources;
}

export const ensureMixBuffers = (sources: readonly MixSource[]): Promise<unknown> =>
  Promise.all(sources.map((s) => audioBufferCache.ensure(s.assetId, s.speed, s.pitch)));

/**
 * Schedules every source onto any AudioContext. The live preview passes a
 * realtime context, export passes an OfflineAudioContext — same code, same mix.
 *
 * @param from timeline second that maps to context time `when`.
 */
export function scheduleMix(
  ctx: BaseAudioContext,
  destination: AudioNode,
  sources: readonly MixSource[],
  from: number,
  when: number,
): AudioBufferSourceNode[] {
  const toCtx = (t: number) => when + (t - from);
  const nodes: AudioBufferSourceNode[] = [];

  for (const source of sources) {
    if (source.end <= from) continue;
    const buffer = audioBufferCache.peek(source.assetId, source.speed, source.pitch);
    if (!buffer) continue;
    const playFrom = Math.max(from, source.start);
    const bufferOffset = source.offset + (playFrom - source.start);
    if (bufferOffset >= buffer.duration) continue;
    const length = Math.min(source.end - playFrom, buffer.duration - bufferOffset);

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    const gain = ctx.createGain();
    applyEnvelope(gain.gain, source, playFrom, playFrom + length, toCtx);
    node.connect(gain).connect(destination);
    node.start(toCtx(playFrom), bufferOffset, length);
    nodes.push(node);
  }
  return nodes;
}

function applyEnvelope(
  param: AudioParam,
  source: MixSource,
  from: number,
  to: number,
  toCtx: (t: number) => number,
): void {
  const fadeIn = Math.max(DECLICK, source.fadeIn);
  const fadeOut = Math.max(DECLICK, source.fadeOut);
  const level = (t: number) =>
    source.volume * Math.max(0, Math.min(1, (t - source.start) / fadeIn, (source.end - t) / fadeOut));

  param.setValueAtTime(level(from), toCtx(from));
  const fadeInEnd = source.start + fadeIn;
  if (fadeInEnd > from) param.linearRampToValueAtTime(source.volume, toCtx(Math.min(fadeInEnd, to)));
  const fadeOutStart = Math.max(from, source.end - fadeOut);
  param.setValueAtTime(level(fadeOutStart), toCtx(fadeOutStart));
  param.linearRampToValueAtTime(0, toCtx(to));
}
