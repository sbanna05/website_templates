import { sortKeys, sampleVolume } from '../engine/automation';
import { STEM_NAMES, isFullMix, stemGains } from '../engine/stems';
import { clipEnd, handOvers } from '../engine/timeline';
import type { Asset, AudioClip, AudioEffects, EqSettings, Project, VolumeKey } from '../types/project';
import { audioBufferCache } from './audioBufferCache';
import { connectEffects, type ReverbBus } from './effects';
import { connectEq } from './eqChain';

/** One file that sounds inside a source — the song itself, or one of its stems. */
export interface MixLayer {
  assetId: string;
  gain: number;
}

/** One sound-producing span on the timeline, normalised across audio and video clips. */
export interface MixSource {
  /** What plays: one layer normally, up to four stems when the clip uses its stem mixer. */
  layers: MixLayer[];
  speed: number;
  pitch: number;
  start: number;
  end: number;
  offset: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  trackId: string;
  /** Only music clips carry sound design, EQ and automation. */
  effects?: AudioEffects;
  eq?: EqSettings;
  volumeKeys?: VolumeKey[];
  /** Source second at `start` (the clip's in-point), to map keys onto the timeline. */
  inPoint: number;
}

const DECLICK = 0.008;
/** Automation curve resolution (points per second) — smooth enough for fast pumps. */
const AUTOMATION_RATE = 120;

/** The files a music clip plays: its stems (at their mixer gains) once split, else the song. */
export function clipLayers(clip: AudioClip, asset: Asset | undefined): MixLayer[] {
  const stems = asset?.stems;
  if (!stems || isFullMix(clip.stems) || !clip.stems) return [{ assetId: clip.assetId, gain: 1 }];
  const gains = stemGains(clip.stems);
  return STEM_NAMES.filter((name) => gains[name] > 0).map((name) => ({ assetId: stems[name], gain: gains[name] }));
}

export function collectMixSources(project: Project, assets: Record<string, Asset>): MixSource[] {
  const muted = new Set(project.tracks.filter((t) => t.muted).map((t) => t.id));
  // Solo, mixing-desk style: while any track is soloed, only soloed tracks are heard.
  const soloed = new Set(project.tracks.filter((t) => t.solo).map((t) => t.id));
  const sources: MixSource[] = [];
  for (const clip of project.clips) {
    if (clip.kind === 'text' || muted.has(clip.trackId) || clip.volume <= 0) continue;
    if (soloed.size > 0 && !soloed.has(clip.trackId)) continue;
    if (clip.kind === 'visual' && !assets[clip.assetId]?.hasAudio) continue;
    const layers = clip.kind === 'audio' ? clipLayers(clip, assets[clip.assetId]) : [{ assetId: clip.assetId, gain: 1 }];
    if (layers.length === 0) continue;
    sources.push({
      layers,
      speed: clip.speed,
      pitch: clip.pitch,
      start: clip.start,
      end: clipEnd(clip),
      offset: clip.inPoint / clip.speed,
      volume: clip.volume,
      fadeIn: clip.kind === 'audio' ? clip.fadeIn : 0,
      fadeOut: clip.kind === 'audio' ? clip.fadeOut : 0,
      trackId: clip.trackId,
      inPoint: clip.inPoint,
      ...(clip.kind === 'audio' ? { effects: clip.effects, eq: clip.eq, volumeKeys: sortKeys(clip.volumeKeys ?? []) } : {}),
    });
  }
  return project.crossfadeOverlaps ? crossfadeOverlaps(sources) : sources;
}

/**
 * Where two clips overlap on the same track, the earlier one fades out and the
 * later one fades in across the overlap — a DJ-style crossfade instead of two
 * songs fighting at full volume. Existing longer fades are kept.
 */
export function crossfadeOverlaps(sources: readonly MixSource[]): MixSource[] {
  const result = sources.map((s) => ({ ...s }));
  const byTrack = new Map<string, MixSource[]>();
  for (const source of result) byTrack.set(source.trackId, [...(byTrack.get(source.trackId) ?? []), source]);
  for (const track of byTrack.values()) {
    for (const [earlier, later] of handOvers(track)) {
      const overlap = earlier.end - later.start;
      earlier.fadeOut = Math.max(earlier.fadeOut, overlap);
      later.fadeIn = Math.max(later.fadeIn, overlap);
    }
  }
  return result;
}

export const ensureMixBuffers = (sources: readonly MixSource[]): Promise<unknown> =>
  Promise.all(sources.flatMap((s) => s.layers.map((layer) => audioBufferCache.ensure(layer.assetId, s.speed, s.pitch))));

/**
 * Schedules every source onto any AudioContext. The live preview passes a
 * realtime context, export passes an OfflineAudioContext — same code, same mix.
 *
 *   layer(s) → layer gain ┐
 *                         ├→ envelope → [automation] → [EQ] → effects → destination
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
  const reverbBus: ReverbBus = new Map();

  for (const source of sources) {
    if (source.end <= from) continue;
    const buffers = source.layers.map((layer) => audioBufferCache.peek(layer.assetId, source.speed, source.pitch));
    const reference = buffers[0];
    if (!reference || buffers.some((b) => !b)) continue;
    const playFrom = Math.max(from, source.start);
    const bufferOffset = source.offset + (playFrom - source.start);
    if (bufferOffset >= reference.duration) continue;
    const length = Math.min(source.end - playFrom, reference.duration - bufferOffset);

    const envelope = ctx.createGain();
    applyEnvelope(envelope.gain, source, playFrom, playFrom + length, toCtx);
    source.layers.forEach((layer, i) => {
      const node = ctx.createBufferSource();
      node.buffer = buffers[i] ?? null;
      if (layer.gain === 1) node.connect(envelope);
      else {
        const gain = ctx.createGain();
        gain.gain.value = layer.gain;
        node.connect(gain).connect(envelope);
      }
      node.start(toCtx(playFrom), bufferOffset, length);
      nodes.push(node);
    });

    let output: AudioNode = envelope;
    if (source.volumeKeys?.length) output = output.connect(automationGain(ctx, source, playFrom, playFrom + length, toCtx));
    output = connectEq(ctx, output, source.eq);
    connectEffects(ctx, output, destination, source.effects, reverbBus);
  }
  return nodes;
}

/** A gain node that follows the clip's volume keyframes between two timeline times. */
function automationGain(ctx: BaseAudioContext, source: MixSource, from: number, to: number, toCtx: (t: number) => number): GainNode {
  const gain = ctx.createGain();
  const toSource = (t: number) => source.inPoint + (t - source.start) * source.speed;
  const curve = sampleVolume(source.volumeKeys ?? [], toSource(from), toSource(to), Math.ceil((to - from) * AUTOMATION_RATE));
  // A curve may not overlap other events on the same param, so the start value is set directly.
  gain.gain.value = curve[0];
  if (to - from > 0.01) gain.gain.setValueCurveAtTime(curve, toCtx(from), to - from);
  return gain;
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
