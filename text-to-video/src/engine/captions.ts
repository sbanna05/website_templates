import type { LyricWord, MediaClip } from '../types/project';
import { clipEnd } from './timeline';

/*
 * Auto captions — turns timed words (from speech recognition) into caption
 * blocks. Pure: no models, no DOM, so it is unit-tested and reusable.
 */

export type CaptionMode = 'phrases' | 'words' | 'karaoke';

export interface CaptionOptions {
  mode: CaptionMode;
  maxWords: number;
  /** A silence longer than this (seconds) starts a new phrase. */
  maxGap: number;
  /** Timeline beats to snap caption starts to; empty = no snapping. */
  beats: readonly number[];
  /** How far (seconds) a start may move to reach a beat. */
  snapWindow?: number;
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  words: LyricWord[];
}

const NON_SPEECH = /^[[(♪*].*|^[♪\s.…-]+$/;
const ENDS_SENTENCE = /[.!?,;:]$/;
const MIN_CAPTION = 0.25;
const TAIL = 0.35;

export function cleanWords(words: readonly LyricWord[]): LyricWord[] {
  return words
    .map((w) => ({ ...w, text: w.text.trim() }))
    .filter((w) => w.text.length > 0 && !NON_SPEECH.test(w.text) && w.end >= w.start);
}

/** Maps words from source seconds to timeline seconds through a clip; drops words outside it. */
export function wordsOnTimeline(words: readonly LyricWord[], clip: MediaClip): LyricWord[] {
  const toTimeline = (s: number) => clip.start + (s - clip.inPoint) / clip.speed;
  return words
    .map((w) => ({ text: w.text, start: toTimeline(w.start), end: toTimeline(w.end) }))
    .filter((w) => w.start >= clip.start - 1e-6 && w.start < clipEnd(clip));
}

function group(words: readonly LyricWord[], { mode, maxWords, maxGap }: CaptionOptions): LyricWord[][] {
  if (mode === 'words') return words.map((w) => [w]);
  const groups: LyricWord[][] = [];
  let current: LyricWord[] = [];
  for (const word of words) {
    const previous = current[current.length - 1];
    const breakHere =
      previous && (current.length >= maxWords || word.start - previous.end > maxGap || ENDS_SENTENCE.test(previous.text));
    if (breakHere) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length) groups.push(current);
  return groups;
}

function nearestBeat(time: number, beats: readonly number[], window: number): number {
  let best = time;
  let distance = window;
  for (const beat of beats) {
    if (Math.abs(beat - time) <= distance) {
      best = beat;
      distance = Math.abs(beat - time);
    }
    if (beat > time + window) break;
  }
  return best;
}

/** Groups words into non-overlapping captions in timeline seconds. */
export function buildCaptions(words: readonly LyricWord[], options: CaptionOptions): Caption[] {
  const window = options.snapWindow ?? 0.15;
  const captions = group(words, options).map((ws): Caption => {
    const start = options.beats.length ? nearestBeat(ws[0].start, options.beats, window) : ws[0].start;
    return { text: ws.map((w) => w.text).join(' '), start, end: ws[ws.length - 1].end + TAIL, words: ws };
  });
  // Each caption ends where the next begins, and never shorter than readable.
  captions.forEach((caption, i) => {
    const next = captions[i + 1];
    if (next) caption.end = Math.min(caption.end, next.start);
    caption.end = Math.max(caption.end, caption.start + MIN_CAPTION);
    if (next && next.start < caption.end) next.start = caption.end;
  });
  return captions;
}
