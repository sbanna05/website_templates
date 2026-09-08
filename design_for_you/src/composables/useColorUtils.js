// Small, dependency-free color math used by the palette + mixer panels.

export function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim()
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6)
  const value = parseInt(full, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  }
}

export function rgbToHex({ r, g, b }) {
  const toHex = (channel) =>
    Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Mixes `hex` toward `targetHex` by `ratio` (0 = no change, 1 = fully target). */
export function mixHex(hex, targetHex, ratio) {
  const from = hexToRgb(hex)
  const to = hexToRgb(targetHex)
  return rgbToHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio
  })
}

// A tint mixes a color with white, a shade mixes with black,
// and a tone mixes with neutral gray.
export const tint = (hex, ratio) => mixHex(hex, '#ffffff', ratio)
export const shade = (hex, ratio) => mixHex(hex, '#000000', ratio)
export const tone = (hex, ratio) => mixHex(hex, '#808080', ratio)

export const MIX_STEPS = [0.2, 0.4, 0.6, 0.8]

/** Rough perceived-brightness check, used to decide label contrast on a swatch. */
export function isLight(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}
