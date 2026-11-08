import type { StemChannel, StemMix, StemName } from '../types/project';

/*
 * Stem mixing. Once a song is split (AI source separation, see `stems/`), each
 * clip of it can play any blend of its four stems — vocals, drums, bass and
 * "melody" (everything else) — like the stem faders in a DJ app.
 */

export interface StemInfo {
  id: StemName;
  label: string;
  /** CSS colour token used for its waveform lane. */
  color: string;
}

export const STEMS: readonly StemInfo[] = [
  { id: 'vocals', label: 'Vocals', color: 'var(--stem-vocals)' },
  { id: 'drums', label: 'Drums', color: 'var(--stem-drums)' },
  { id: 'bass', label: 'Bass', color: 'var(--stem-bass)' },
  { id: 'other', label: 'Melody', color: 'var(--stem-other)' },
];

export const STEM_NAMES: readonly StemName[] = STEMS.map((s) => s.id);

export const STEM_VOLUME_MAX = 1.5;

const channel = (volume = 1, muted = false): StemChannel => ({ volume, muted, solo: false });

export const FULL_STEM_MIX: StemMix = { vocals: channel(), drums: channel(), bass: channel(), other: channel() };

/** Effective gain of every stem: solo wins over mute, mute wins over volume. */
export function stemGains(mix: StemMix): Record<StemName, number> {
  const soloing = STEM_NAMES.some((name) => mix[name].solo);
  const gains = {} as Record<StemName, number>;
  for (const name of STEM_NAMES) {
    const { volume, muted, solo } = mix[name];
    gains[name] = soloing ? (solo ? volume : 0) : muted ? 0 : volume;
  }
  return gains;
}

/** True when the mix sounds like the original song (all stems at unity). */
export const isFullMix = (mix: StemMix | undefined): boolean =>
  !mix || STEM_NAMES.every((name) => !mix[name].muted && !mix[name].solo && mix[name].volume === 1);

export interface StemPreset {
  id: string;
  name: string;
  hint: string;
  /** Stems that stay audible; the rest are muted. */
  keep: readonly StemName[];
}

export const STEM_PRESETS: readonly StemPreset[] = [
  { id: 'full', name: 'Full song', hint: 'All stems', keep: STEM_NAMES },
  { id: 'instrumental', name: 'Instrumental', hint: 'Everything but the vocals', keep: ['drums', 'bass', 'other'] },
  { id: 'acapella', name: 'Acapella', hint: 'Vocals only', keep: ['vocals'] },
  { id: 'beat', name: 'Beat only', hint: 'Drums and bass — a clean rhythm to cut on', keep: ['drums', 'bass'] },
  { id: 'no-drums', name: 'No drums', hint: 'Vocals, bass and melody', keep: ['vocals', 'bass', 'other'] },
];

export function presetMix(preset: StemPreset): StemMix {
  const mix = {} as StemMix;
  for (const name of STEM_NAMES) mix[name] = channel(1, !preset.keep.includes(name));
  return mix;
}

export const matchesPreset = (mix: StemMix | undefined, preset: StemPreset): boolean => {
  const current = mix ?? FULL_STEM_MIX;
  return STEM_NAMES.every(
    (name) => !current[name].solo && current[name].volume === 1 && current[name].muted === !preset.keep.includes(name),
  );
};
