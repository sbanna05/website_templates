import { gsap } from 'gsap';

export type EaseFn = (t: number) => number;

const cache = new Map<string, EaseFn>();
const linear: EaseFn = (t) => t;

/**
 * GSAP's parsed eases are pure functions, so they're safe to use inside the
 * deterministic frame renderer (preview and export produce identical frames).
 */
export function getEase(name: string): EaseFn {
  const cached = cache.get(name);
  if (cached) return cached;
  const parsed = (gsap.parseEase(name) as EaseFn | undefined) ?? linear;
  cache.set(name, parsed);
  return parsed;
}

export const EASE_OPTIONS = [
  { label: 'Smooth', value: 'power2.out' },
  { label: 'Snappy', value: 'power4.out' },
  { label: 'Expo', value: 'expo.out' },
  { label: 'Overshoot', value: 'back.out(1.7)' },
  { label: 'Elastic', value: 'elastic.out(1, 0.45)' },
  { label: 'Bounce', value: 'bounce.out' },
  { label: 'Sine', value: 'sine.inOut' },
  { label: 'Linear', value: 'none' },
] as const;
