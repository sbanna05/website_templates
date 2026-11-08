import { SimpleFilter, SoundTouch, type SampleSource } from 'soundtouchjs';

const BLOCK = 8192;
/** Silence appended so SoundTouch flushes its internal buffers. */
const FLUSH_FRAMES = 16384;

/**
 * Independent tempo and pitch change (WSOLA via SoundTouch). `tempo` 2 plays
 * twice as fast without chipmunking; `pitch` 2 is one octave up at the same speed.
 */
export function timeStretch(channels: Float32Array[], tempo: number, pitch: number): Float32Array[] {
  const left = channels[0];
  const right = channels[1] ?? channels[0];
  const length = left.length;
  const source: SampleSource = {
    extract(target, numFrames, position) {
      const available = Math.max(0, Math.min(numFrames, length + FLUSH_FRAMES - position));
      for (let i = 0; i < available; i += 1) {
        const index = position + i;
        target[i * 2] = index < length ? left[index] : 0;
        target[i * 2 + 1] = index < length ? right[index] : 0;
      }
      return available;
    },
  };
  const soundTouch = new SoundTouch();
  soundTouch.tempo = tempo;
  soundTouch.pitch = pitch;
  const filter = new SimpleFilter(source, soundTouch);

  const expected = Math.ceil(length / tempo);
  const outL = new Float32Array(expected);
  const outR = new Float32Array(expected);
  const block = new Float32Array(BLOCK * 2);
  let written = 0;
  while (written < expected) {
    const got = filter.extract(block, BLOCK);
    if (got === 0) break;
    const take = Math.min(got, expected - written);
    for (let i = 0; i < take; i += 1) {
      outL[written + i] = block[i * 2];
      outR[written + i] = block[i * 2 + 1];
    }
    written += take;
  }
  return channels.length > 1 ? [outL, outR] : [outL];
}
