// Dependency-free colour maths: conversion, tints/shades/tones, harmonies
// and WCAG contrast. Every function takes and returns '#rrggbb' strings.

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Returns a normalised '#rrggbb', or null when `value` is not a hex colour. */
export function parseHex(value) {
  const match = HEX_PATTERN.exec(String(value).trim())
  if (!match) return null
  const digits = match[1].length === 3
    ? [...match[1]].map((digit) => digit + digit).join('')
    : match[1]
  return `#${digits.toLowerCase()}`
}

export function hexToRgb(hex) {
  const value = parseInt(parseHex(hex).slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export function rgbToHex({ r, g, b }) {
  const channel = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

export function hslToHex({ h, s, l }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const segment = (((h % 360) + 360) % 360) / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))
  const [r, g, b] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x]
  ][Math.floor(segment) % 6]
  const m = l - chroma / 2
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
}

/** Mixes `hex` toward `targetHex` by `ratio` (0 = unchanged, 1 = fully target). */
export function mixHex(hex, targetHex, ratio) {
  const from = hexToRgb(hex)
  const to = hexToRgb(targetHex)
  return rgbToHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio
  })
}

// A tint mixes with white, a shade with black, a tone with neutral grey.
export const tint = (hex, ratio) => mixHex(hex, '#ffffff', ratio)
export const shade = (hex, ratio) => mixHex(hex, '#000000', ratio)
export const tone = (hex, ratio) => mixHex(hex, '#808080', ratio)

export const MIX_STEPS = [0.2, 0.4, 0.6, 0.8]

export const MIX_ROWS = [
  { key: 'tint', label: 'Tints', hint: 'lighter, mixed with white', fn: tint },
  { key: 'shade', label: 'Shades', hint: 'darker, mixed with black', fn: shade },
  { key: 'tone', label: 'Tones', hint: 'softer, mixed with grey', fn: tone }
]

function rotateHue(hex, degrees) {
  const hsl = hexToHsl(hex)
  return hslToHex({ ...hsl, h: hsl.h + degrees })
}

/**
 * Colour-wheel partners for `hex`. Each scheme lists the colours that sit
 * well beside the base, with a plain-language note on the effect.
 */
export function harmonies(hex) {
  const { h, s } = hexToHsl(hex)
  return [
    {
      key: 'complementary',
      label: 'Opposite',
      hint: 'strong contrast, use as an accent',
      colors: [rotateHue(hex, 180)]
    },
    {
      key: 'analogous',
      label: 'Neighbours',
      hint: 'calm, blends easily',
      colors: [rotateHue(hex, -30), rotateHue(hex, 30)]
    },
    {
      key: 'split',
      label: 'Split opposite',
      hint: 'contrast with less tension',
      colors: [rotateHue(hex, 150), rotateHue(hex, 210)]
    },
    {
      key: 'triadic',
      label: 'Triad',
      hint: 'lively and balanced',
      colors: [rotateHue(hex, 120), rotateHue(hex, 240)]
    },
    {
      key: 'neutral',
      label: 'Quiet neutrals',
      hint: 'backdrops in the same hue',
      colors: [
        hslToHex({ h, s: Math.min(s, 0.12), l: 0.9 }),
        hslToHex({ h, s: Math.min(s, 0.1), l: 0.62 }),
        hslToHex({ h, s: Math.min(s, 0.14), l: 0.2 })
      ]
    }
  ]
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const linear = (channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG contrast ratio between two colours, from 1 (none) to 21 (black on white). */
export function contrastRatio(hexA, hexB) {
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/** True when dark text reads better than light text on `hex`. */
export function isLight(hex) {
  return contrastRatio(hex, '#111111') >= contrastRatio(hex, '#ffffff')
}
