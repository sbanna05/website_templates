import { eqFilters, qToDb } from '../engine/eq';
import type { EqSettings } from '../types/project';

/**
 * Builds the EQ as a chain of BiquadFilterNodes after `input` and returns its
 * output. Flat bands add no node, so a flat EQ costs nothing.
 */
export function connectEq(ctx: BaseAudioContext, input: AudioNode, eq: EqSettings | undefined): AudioNode {
  if (!eq) return input;
  let node = input;
  for (const band of eqFilters(eq)) {
    const filter = ctx.createBiquadFilter();
    filter.type = band.kind;
    filter.frequency.value = band.frequency;
    filter.gain.value = band.gain;
    // Pass/cut filters take Q in dB in Web Audio; bells take a plain Q.
    filter.Q.value = band.kind === 'highpass' ? qToDb(band.q) : band.q;
    node = node.connect(filter);
  }
  return node;
}
