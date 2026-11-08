export interface FontOption {
  family: string;
  label: string;
  category: 'sans' | 'display' | 'serif' | 'script' | 'mono';
  weights: number[];
}

/** Loaded from Google Fonts in index.html — keep both lists in sync. */
export const FONTS: FontOption[] = [
  { family: 'Inter', label: 'Inter', category: 'sans', weights: [400, 600, 800, 900] },
  { family: 'Montserrat', label: 'Montserrat', category: 'sans', weights: [400, 600, 800, 900] },
  { family: 'Space Grotesk', label: 'Space Grotesk', category: 'sans', weights: [400, 500, 700] },
  { family: 'Syne', label: 'Syne', category: 'display', weights: [500, 700, 800] },
  { family: 'Bebas Neue', label: 'Bebas Neue', category: 'display', weights: [400] },
  { family: 'Anton', label: 'Anton', category: 'display', weights: [400] },
  { family: 'Archivo Black', label: 'Archivo Black', category: 'display', weights: [400] },
  { family: 'Oswald', label: 'Oswald', category: 'display', weights: [400, 600, 700] },
  { family: 'Bangers', label: 'Bangers', category: 'display', weights: [400] },
  { family: 'Righteous', label: 'Righteous', category: 'display', weights: [400] },
  { family: 'Playfair Display', label: 'Playfair Display', category: 'serif', weights: [400, 700, 900] },
  { family: 'DM Serif Display', label: 'DM Serif Display', category: 'serif', weights: [400] },
  { family: 'Pacifico', label: 'Pacifico', category: 'script', weights: [400] },
  { family: 'Caveat', label: 'Caveat', category: 'script', weights: [400, 700] },
  { family: 'Permanent Marker', label: 'Permanent Marker', category: 'script', weights: [400] },
  { family: 'JetBrains Mono', label: 'JetBrains Mono', category: 'mono', weights: [400, 700, 800] },
];

export const fontByFamily = (family: string): FontOption =>
  FONTS.find((font) => font.family === family) ?? FONTS[0];

/** Snaps a requested weight to the closest weight the font ships with. */
export function closestWeight(family: string, weight: number): number {
  const { weights } = fontByFamily(family);
  return weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), weights[0]);
}

export const cssFont = (family: string, weight: number, sizePx: number, italic = false): string =>
  `${italic ? 'italic ' : ''}${closestWeight(family, weight)} ${sizePx}px "${family}"`;
