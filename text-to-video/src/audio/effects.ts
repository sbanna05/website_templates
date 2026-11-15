import type { AudioEffects } from '../types/project';

/*
 * Per-clip effect chain, built from plain Web Audio nodes so it runs the same in
 * a realtime AudioContext (preview) and an OfflineAudioContext (export):
 *
 *   input → [low-pass] → output ─────────────→ destination   (dry)
 *                                └→ send → convolver → destination   (wet)
 *
 * Vocal removal/isolation is real AI stem separation now (see `stems/`), not a filter trick.
 */

export const isDry = (fx: AudioEffects | undefined): boolean =>
  !fx || (fx.reverb <= 0 && fx.lowpass <= 0);

/** 0–1 → 20 kHz … 400 Hz, exponential so the slider feels even. */
export const lowpassHz = (amount: number): number => 20000 * Math.pow(400 / 20000, amount);

/** 0–1 → reverb tail length in seconds. */
export const reverbSeconds = (roomSize: number): number => 0.6 + roomSize * 4.4;

/** Small deterministic PRNG so preview and export get the exact same reverb. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const irCache = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();

/**
 * Synthetic room impulse: decaying stereo noise that gets darker as it fades
 * (high frequencies die first, like a real hall).
 */
function impulseResponse(ctx: BaseAudioContext, roomSize: number): AudioBuffer {
  const key = Math.round(roomSize * 20) / 20;
  let byContext = irCache.get(ctx);
  if (!byContext) irCache.set(ctx, (byContext = new Map()));
  const cached = byContext.get(key);
  if (cached) return cached;

  const seconds = reverbSeconds(key);
  const length = Math.ceil(seconds * ctx.sampleRate);
  const preDelay = Math.floor(0.012 * ctx.sampleRate);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const random = mulberry32(1234 + channel * 777);
    const data = buffer.getChannelData(channel);
    let smooth = 0;
    for (let i = preDelay; i < length; i += 1) {
      const progress = i / length;
      const damping = 0.15 + progress * 0.8; // one-pole low-pass that closes over time
      smooth += (random() * 2 - 1 - smooth) * (1 - damping);
      data[i] = smooth * Math.pow(1 - progress, 2.2);
    }
  }
  byContext.set(key, buffer);
  return buffer;
}

/**
 * Shared reverb returns for one mix, one per room size — like a mixing desk's
 * reverb send. Convolution is the most expensive node in Web Audio, so clips
 * that use the same room share a single convolver instead of running one each.
 */
export type ReverbBus = Map<number, ConvolverNode>;

function reverbReturn(ctx: BaseAudioContext, destination: AudioNode, roomSize: number, bus?: ReverbBus): ConvolverNode {
  const key = Math.round(roomSize * 20) / 20;
  const shared = bus?.get(key);
  if (shared) return shared;
  const convolver = ctx.createConvolver();
  convolver.buffer = impulseResponse(ctx, key);
  convolver.connect(destination);
  bus?.set(key, convolver);
  return convolver;
}

/** Wires `input` through the clip's effects into `destination` (a straight connection when dry). */
export function connectEffects(
  ctx: BaseAudioContext,
  input: AudioNode,
  destination: AudioNode,
  fx: AudioEffects | undefined,
  reverbBus?: ReverbBus,
): void {
  if (!fx || isDry(fx)) {
    input.connect(destination);
    return;
  }
  let node = input;
  if (fx.lowpass > 0) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassHz(fx.lowpass);
    filter.Q.value = 0.8;
    node = node.connect(filter);
  }
  const dry = ctx.createGain();
  dry.gain.value = 1 - 0.35 * fx.reverb;
  node.connect(dry).connect(destination);
  if (fx.reverb > 0) {
    const send = ctx.createGain();
    send.gain.value = fx.reverb * 0.9;
    node.connect(send).connect(reverbReturn(ctx, destination, fx.roomSize, reverbBus));
  }
}

/** One-tap sound design presets. Speed/pitch are applied too, so "Slowed + reverb" sounds right immediately. */
export interface SoundPreset {
  id: string;
  name: string;
  hint: string;
  effects: AudioEffects;
  speed?: number;
  pitch?: number;
}

export const SOUND_PRESETS: readonly SoundPreset[] = [
  { id: 'dry', name: 'Original', hint: 'No effects, original speed and pitch', effects: { reverb: 0, roomSize: 0.5, lowpass: 0 }, speed: 1, pitch: 0 },
  // Classic "slowed + reverb": ~85 % speed with the pitch dropping along with it (tape-style), plus a big room.
  { id: 'slowed', name: 'Slowed + reverb', hint: '85 % speed, deeper pitch, big room', effects: { reverb: 0.45, roomSize: 0.75, lowpass: 0.12 }, speed: 0.85, pitch: -3 },
  { id: 'sped', name: 'Sped up', hint: '125 % speed with a brighter pitch (nightcore)', effects: { reverb: 0.1, roomSize: 0.3, lowpass: 0 }, speed: 1.25, pitch: 4 },
  { id: 'lofi', name: 'Lo-fi', hint: 'Muffled and roomy, like an old radio', effects: { reverb: 0.25, roomSize: 0.4, lowpass: 0.45 } },
  { id: 'underwater', name: 'Underwater', hint: 'Heavily muffled, distant', effects: { reverb: 0.35, roomSize: 0.6, lowpass: 0.85 } },
  { id: 'hall', name: 'Concert hall', hint: 'Long, spacious reverb', effects: { reverb: 0.5, roomSize: 0.95, lowpass: 0 } },
];
