import { FLAT_EQ } from '../engine/eq';
import type { MasterSettings } from '../types/project';
import { connectEq } from './eqChain';

/*
 * Master bus — the last stage every sound goes through, in preview and export:
 *
 *   input → volume → EQ → glue compressor → limiter → safety clipper → destination
 *
 * The safety clipper is always on: a compressor can't catch the very first
 * milliseconds of a peak, and anything over 0 dBFS reaches the speakers as a
 * crack. The clipper is transparent below −2 dBFS and rounds off the rest.
 */

/** Level up to which the safety clipper changes nothing (≈ −2 dBFS). */
const CLIP_KNEE = 0.8;
/** Largest input level the curve covers; louder is held at the ceiling. */
const CLIP_RANGE = 4;

/** Transfer curve of the safety clipper: linear to the knee, then a tanh shoulder that never passes 1. */
export function softClip(x: number): number {
  const a = Math.abs(x);
  if (a <= CLIP_KNEE) return x;
  const headroom = 1 - CLIP_KNEE;
  return Math.sign(x) * (CLIP_KNEE + headroom * Math.tanh((a - CLIP_KNEE) / headroom));
}

let clipCurve: Float32Array<ArrayBuffer> | null = null;

function safetyClipper(ctx: BaseAudioContext): { input: AudioNode; output: AudioNode } {
  // A WaveShaper reads its curve over −1…1, so the signal is scaled down first and the curve maps back up.
  if (!clipCurve) {
    const size = 16385;
    clipCurve = new Float32Array(size);
    for (let i = 0; i < size; i += 1) clipCurve[i] = softClip(((i / (size - 1)) * 2 - 1) * CLIP_RANGE);
  }
  const input = ctx.createGain();
  input.gain.value = 1 / CLIP_RANGE;
  const shaper = ctx.createWaveShaper();
  shaper.curve = clipCurve;
  shaper.oversample = '2x';
  input.connect(shaper);
  return { input, output: shaper };
}

export const DEFAULT_MASTER: MasterSettings = { volume: 1, eq: FLAT_EQ, glue: 0, limiter: true };

/** Glue amount 0–1 → bus-compressor settings (gentle 1.5:1 up to a firm 4:1). */
export const glueSettings = (amount: number) => ({
  threshold: -8 - 16 * amount,
  ratio: 1.5 + 2.5 * amount,
  makeup: 1 + 0.6 * amount,
});

/** Wires the master chain into `destination` and returns the node to connect the mix to. */
export function connectMaster(ctx: BaseAudioContext, destination: AudioNode, master: MasterSettings): AudioNode {
  const input = ctx.createGain();
  input.gain.value = master.volume;
  let node: AudioNode = connectEq(ctx, input, master.eq);

  if (master.glue > 0) {
    const { threshold, ratio, makeup } = glueSettings(master.glue);
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = threshold;
    glue.ratio.value = ratio;
    glue.knee.value = 8;
    glue.attack.value = 0.015;
    glue.release.value = 0.25;
    const gain = ctx.createGain();
    gain.gain.value = makeup;
    node = node.connect(glue).connect(gain);
  }

  if (master.limiter) {
    // A fast, hard-knee, high-ratio compressor just under 0 dBFS acts as a brick-wall limiter.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    node = node.connect(limiter);
  }

  const clipper = safetyClipper(ctx);
  node.connect(clipper.input);
  clipper.output.connect(destination);
  return input;
}
