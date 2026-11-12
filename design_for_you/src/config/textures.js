// Every material the picker offers, with the licence record for each image.
//
// This file has no browser imports on purpose: the app reads it, and so do
// scripts/optimize-textures.mjs and scripts/check-assets.mjs.
//
// Adding a photo texture:
//   1. Put the full-size file in texture-sources/.
//   2. Add an entry to `photoTextures` with its source page and licence.
//   3. Run `npm run textures`, then `npm run check`.

/** Licences we accept without further review. Anything else fails `npm run check`. */
export const APPROVED_LICENSES = ['CC0-1.0', 'Generated in app']

/**
 * Photographed textures. `tileMeters` is the real-world width one repeat
 * covers, so a cabinet and a wall show the same weave size.
 */
export const photoTextures = [
  {
    id: 'tiled-floor',
    name: 'Earthen tile',
    alt: 'Square brown stone floor tiles with a mottled surface and thin grout lines',
    sourceFile: 'tiled_floor_001.jpg',
    tileMeters: 1.5,
    license: 'CC0-1.0',
    source: 'Poly Haven',
    sourceUrl: 'https://polyhaven.com/a/tiled_floor_001',
    authors: 'Rob Tuytel, Dimitrios Savva',
    reviewed: '2026-11-12'
  },
  {
    id: 'flour',
    name: 'Soft plaster',
    alt: 'Smooth cream surface with a faint, soft mottling',
    sourceFile: 'flour_diff_4k.jpg',
    tileMeters: 1.2,
    license: 'CC0-1.0',
    source: 'Poly Haven',
    sourceUrl: 'https://polyhaven.com/a/flour',
    authors: 'Jenelle van Heerden',
    reviewed: '2026-11-12'
  },
  {
    id: 'fabric-check',
    name: 'Red gingham',
    alt: 'Coarse woven cotton in a red and cream gingham check',
    sourceFile: 'fabric_pattern_07_col_1_1k.png',
    tileMeters: 0.4,
    license: 'CC0-1.0',
    source: 'Poly Haven',
    sourceUrl: 'https://polyhaven.com/a/fabric_pattern_07',
    authors: 'Rob Tuytel',
    reviewed: '2026-11-12'
  },
  {
    id: 'floral-jacquard',
    name: 'Floral jacquard',
    alt: 'Charcoal jacquard fabric with a raised floral damask pattern',
    sourceFile: 'floral_jacquard_diff_1k.jpg',
    tileMeters: 0.5,
    license: 'CC0-1.0',
    source: 'Poly Haven',
    sourceUrl: 'https://polyhaven.com/a/floral_jacquard',
    authors: 'colormass, Rico Cilliers',
    reviewed: '2026-11-12'
  },
  {
    id: 'velvet',
    name: 'Velour velvet',
    alt: 'Crimson velvet with a fine, even nap',
    sourceFile: 'velour_velvet_diff_1k.jpg',
    tileMeters: 0.6,
    license: 'CC0-1.0',
    source: 'Poly Haven',
    sourceUrl: 'https://polyhaven.com/a/velour_velvet',
    authors: 'colormass, Rico Cilliers',
    reviewed: '2026-11-12'
  }
].map((texture) => ({
  ...texture,
  kind: 'photo',
  url: `/textures/${texture.id}.webp`,
  thumbUrl: `/textures/${texture.id}.thumb.webp`
}))

/**
 * Patterns drawn on a canvas at runtime (see src/studio/proceduralTextures.js).
 * They are pale and low-contrast so any colour tints them cleanly.
 */
export const proceduralTextures = [
  { id: 'oak', name: 'Oak grain', alt: 'Pale oak with long straight grain lines', tileMeters: 1.2 },
  { id: 'linen', name: 'Linen weave', alt: 'Light linen with a fine crossed weave', tileMeters: 0.35 },
  { id: 'marble', name: 'Veined marble', alt: 'White marble with soft grey veins', tileMeters: 1.6 },
  { id: 'terrazzo', name: 'Terrazzo', alt: 'Pale terrazzo scattered with small stone chips', tileMeters: 0.9 },
  { id: 'ribbed', name: 'Ribbed knit', alt: 'Soft vertical ribs like a knitted jumper or fluted panel', tileMeters: 0.3 },
  { id: 'herringbone', name: 'Herringbone', alt: 'Narrow planks laid in a herringbone zigzag', tileMeters: 0.8 }
].map((texture) => ({
  ...texture,
  kind: 'procedural',
  license: 'Generated in app',
  source: 'Design For You',
  sourceUrl: null,
  authors: 'Drawn by the app, no image file',
  reviewed: '2026-11-12'
}))

export const textures = [...proceduralTextures, ...photoTextures]

export const textureById = Object.fromEntries(textures.map((texture) => [texture.id, texture]))
