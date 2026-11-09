import { lastIndexAtOrBefore } from '../lib/math';
import type { Asset, AudioClip, ChordSegment, MusicalKey, PitchClass } from '../types/project';

/*
 * Naming and comparing keys and chords — what the DJ / producer sees.
 * Camelot codes (8A = A minor, 8B = C major…) make harmonic mixing a matter of
 * picking neighbours on the wheel: same number, ±1, or the A↔B swap.
 */

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const;

const mod12 = (n: number) => ((Math.round(n) % 12) + 12) % 12;

export const noteName = (pc: PitchClass): string => NOTE_NAMES[mod12(pc)];

/** "Am", "F♯", "C/E", or "N.C." (no chord). `shift` transposes in semitones (the clip's pitch). */
export function chordName(chord: Pick<ChordSegment, 'root' | 'quality' | 'bass'>, shift = 0): string {
  if (chord.root < 0) return 'N.C.';
  const name = `${noteName(chord.root + shift)}${chord.quality === 'min' ? 'm' : ''}`;
  return chord.bass !== undefined ? `${name}/${noteName(chord.bass + shift)}` : name;
}

export const transposeKey = (key: MusicalKey, shift: number): MusicalKey => ({ ...key, tonic: mod12(key.tonic + shift) });

/** "A minor", "F♯ major". */
export const keyName = (key: MusicalKey): string => `${noteName(key.tonic)} ${key.mode}`;

/** Short form used on clips: "Am", "F♯". */
export const keyShort = (key: MusicalKey): string => `${noteName(key.tonic)}${key.mode === 'minor' ? 'm' : ''}`;

export interface Camelot {
  number: number;
  letter: 'A' | 'B';
}

/** Position on the Camelot wheel: majors are B, minors A; neighbours a fifth apart. */
export function camelot(key: MusicalKey): Camelot {
  const major = key.mode === 'major' ? key.tonic : mod12(key.tonic + 3);
  return { number: (((major * 7) % 12) + 7) % 12 + 1, letter: key.mode === 'major' ? 'B' : 'A' };
}

export const camelotCode = (key: MusicalKey): string => {
  const c = camelot(key);
  return `${c.number}${c.letter}`;
};

export type KeyMatch = 'same' | 'perfect' | 'energy' | 'clash';

/** How well two keys mix: same key, a wheel neighbour (perfect), a two-step "energy boost", or a clash. */
export function keyCompatibility(a: MusicalKey, b: MusicalKey): KeyMatch {
  const x = camelot(a);
  const y = camelot(b);
  const step = Math.min((x.number - y.number + 12) % 12, (y.number - x.number + 12) % 12);
  if (step === 0 && x.letter === y.letter) return 'same';
  if ((step === 1 && x.letter === y.letter) || (step === 0 && x.letter !== y.letter)) return 'perfect';
  if (step === 2 && x.letter === y.letter) return 'energy';
  return 'clash';
}

/** The four keys that mix perfectly with `key`, as Camelot codes. */
export function compatibleCodes(key: MusicalKey): string[] {
  const { number, letter } = camelot(key);
  const wrap = (n: number) => ((n - 1 + 12) % 12) + 1;
  return [`${number}${letter}`, `${wrap(number - 1)}${letter}`, `${wrap(number + 1)}${letter}`, `${number}${letter === 'A' ? 'B' : 'A'}`];
}

/** The chord sounding at a source-file second. */
export function chordAt(chords: readonly ChordSegment[], sourceTime: number): ChordSegment | undefined {
  if (chords.length === 0) return undefined;
  const i = lastIndexAtOrBefore(
    chords.map((c) => c.start),
    sourceTime,
  );
  const chord = chords[i];
  return chord && sourceTime < chord.end ? chord : undefined;
}

/** The key a clip actually plays in: the song's key moved by the clip's pitch shift. */
export function clipKey(clip: AudioClip, asset: Asset | undefined): MusicalKey | null {
  const key = asset?.harmony?.key;
  return key ? transposeKey(key, clip.pitch) : null;
}

/** A clip's chords placed on the timeline (seconds), clipped to the clip, with names already transposed. */
export function timelineChords(clip: AudioClip, asset: Asset | undefined): { start: number; end: number; name: string; chord: ChordSegment }[] {
  const chords = asset?.harmony?.chords ?? [];
  const from = clip.inPoint;
  const to = clip.inPoint + clip.duration * clip.speed;
  const toTimeline = (s: number) => clip.start + (s - clip.inPoint) / clip.speed;
  return chords
    .filter((c) => c.end > from && c.start < to)
    .map((chord) => ({
      start: toTimeline(Math.max(chord.start, from)),
      end: toTimeline(Math.min(chord.end, to)),
      name: chordName(chord, clip.pitch),
      chord,
    }));
}
