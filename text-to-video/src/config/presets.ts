import { DEFAULT_TEXT_ANIMATION, DEFAULT_TEXT_STYLE, NEUTRAL_FILTERS } from './defaults';
import type { Filters, TextAnimation, TextStyle } from '../types/project';

export interface TextPreset {
  id: string;
  name: string;
  sample: string;
  style: Partial<TextStyle>;
  animation: Partial<TextAnimation>;
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: 'caption',
    name: 'Bold caption',
    sample: 'say less',
    style: { fontFamily: 'Montserrat', fontWeight: 900, strokeWidth: 6, strokeColor: '#0b0f12', shadowBlur: 0 },
    animation: { in: 'pop', unit: 'word', stagger: 0.1 },
  },
  {
    id: 'mvm',
    name: 'MVM impact',
    sample: 'NO MERCY',
    style: { fontFamily: 'Anton', fontSize: 150, uppercase: true, letterSpacing: 4, color: '#eef2f3' },
    animation: { in: 'stretch', loop: 'beat-pulse', unit: 'word', revealOnBeat: true, ease: 'expo.out' },
  },
  {
    id: 'cinema',
    name: 'Cinematic title',
    sample: 'The Long Road',
    style: { fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 104, letterSpacing: 2, shadowBlur: 30 },
    animation: { in: 'blur-in', unit: 'char', stagger: 0.04, inDuration: 0.8, ease: 'power2.out', out: 'blur-out' },
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    sample: 'sing it back',
    style: {
      fontFamily: 'Inter',
      fontWeight: 800,
      fontSize: 80,
      background: 'pill',
      backgroundColor: 'rgba(16, 22, 27, 0.78)',
      highlightColor: '#9fd3b8',
    },
    animation: { in: 'karaoke', unit: 'word', stagger: 0.32 },
  },
  {
    id: 'typewriter',
    name: 'Typewriter note',
    sample: 'day 01 — tokyo',
    style: { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 64, background: 'box', backgroundColor: '#e7ecee', color: '#10161b', shadowBlur: 0 },
    animation: { in: 'typewriter', unit: 'char', stagger: 0.05, out: 'fade' },
  },
  {
    id: 'comic',
    name: 'Comic pop',
    sample: 'BOOM!',
    style: { fontFamily: 'Bangers', fontSize: 160, color: '#e9eef0', strokeWidth: 10, strokeColor: '#1c3b4f', letterSpacing: 3 },
    animation: { in: 'bounce', loop: 'beat-shake', unit: 'char', stagger: 0.05, ease: 'bounce.out' },
  },
  {
    id: 'handwritten',
    name: 'Handwritten',
    sample: 'summer memories',
    style: { fontFamily: 'Caveat', fontWeight: 700, fontSize: 120, color: '#dfe9e4', shadowBlur: 24 },
    animation: { in: 'fade', loop: 'float', unit: 'word', inDuration: 0.6 },
  },
  {
    id: 'glitch',
    name: 'Glitch tag',
    sample: 'SYSTEM_ERROR',
    style: { fontFamily: 'Syne', fontWeight: 800, fontSize: 110, uppercase: true, color: '#cfe0ea' },
    animation: { in: 'glitch-in', loop: 'jitter', unit: 'char', stagger: 0.03 },
  },
];

export const applyTextPreset = (preset: TextPreset): { style: TextStyle; animation: TextAnimation } => ({
  style: { ...DEFAULT_TEXT_STYLE, ...preset.style },
  animation: { ...DEFAULT_TEXT_ANIMATION, ...preset.animation },
});

export interface FilterPreset {
  id: string;
  name: string;
  filters: Filters;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'original', name: 'Original', filters: NEUTRAL_FILTERS },
  { id: 'cinema', name: 'Cinema', filters: { ...NEUTRAL_FILTERS, contrast: 1.15, saturation: 0.85, vignette: 0.45 } },
  { id: 'mono', name: 'Mono', filters: { ...NEUTRAL_FILTERS, saturation: 0, contrast: 1.2 } },
  { id: 'faded', name: 'Faded', filters: { ...NEUTRAL_FILTERS, contrast: 0.85, brightness: 1.08, saturation: 0.75 } },
  { id: 'cool', name: 'Cool', filters: { ...NEUTRAL_FILTERS, hue: -12, saturation: 0.9, contrast: 1.05 } },
  { id: 'warm', name: 'Warm', filters: { ...NEUTRAL_FILTERS, hue: 10, saturation: 1.15, brightness: 1.04 } },
  { id: 'punch', name: 'Punch', filters: { ...NEUTRAL_FILTERS, contrast: 1.3, saturation: 1.3, vignette: 0.25 } },
  { id: 'dream', name: 'Dream', filters: { ...NEUTRAL_FILTERS, blur: 1.2, brightness: 1.1, saturation: 0.9 } },
];
