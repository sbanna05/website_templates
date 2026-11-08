import { FLAT_EQ } from '../engine/eq';
import type { MasterSettings } from '../types/project';
import { connectEq } from './eqChain';

/*
 * Master bus — the last stage every sound goes through, in preview and export:
 *
 *   input → volume → EQ → glue compressor → limiter → destination
 */

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
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    node = node.connect(limiter);
  }

  node.connect(destination);
  return input;
}
