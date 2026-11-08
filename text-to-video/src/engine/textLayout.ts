import { cssFont } from '../config/fonts';
import type { TextStyle, TextUnit } from '../types/project';

export interface LayoutUnit {
  text: string;
  /** Left edge, relative to the block centre. */
  x: number;
  /** Vertical middle of the line, relative to the block centre. */
  y: number;
  width: number;
  line: number;
}

export interface LayoutLine {
  x: number;
  y: number;
  width: number;
}

export interface TextLayout {
  font: string;
  fontPx: number;
  lineHeightPx: number;
  units: LayoutUnit[];
  lines: LayoutLine[];
  width: number;
  height: number;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const supportsLetterSpacing = (ctx: Ctx): boolean => 'letterSpacing' in ctx;

/** Applies font + letter spacing to a context. Must match what `layoutText` measured with. */
export function applyFont(ctx: Ctx, layout: TextLayout, letterSpacingPx: number): void {
  ctx.font = layout.font;
  if (supportsLetterSpacing(ctx)) (ctx as CanvasRenderingContext2D).letterSpacing = `${letterSpacingPx}px`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
}

const cache = new Map<string, TextLayout>();
const CACHE_LIMIT = 300;

export function layoutText(
  ctx: Ctx,
  rawText: string,
  style: TextStyle,
  unit: TextUnit,
  frameWidth: number,
  scale: number,
): TextLayout {
  const key = `${rawText}|${unit}|${frameWidth}|${scale}|${style.fontFamily}|${style.fontWeight}|${style.fontSize}|${style.letterSpacing}|${style.lineHeight}|${style.uppercase}|${style.italic}|${style.maxWidth}|${style.align}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const fontPx = style.fontSize * scale;
  const font = cssFont(style.fontFamily, style.fontWeight, fontPx, style.italic);
  const letterSpacingPx = style.letterSpacing * scale;
  const partial = { font, fontPx } as TextLayout;
  ctx.save();
  applyFont(ctx, partial, letterSpacingPx);
  const measure = (s: string) => ctx.measureText(s).width;

  const text = style.uppercase ? rawText.toUpperCase() : rawText;
  const maxWidth = style.maxWidth * frameWidth;
  const spaceWidth = measure(' ');

  // 1. Greedy word wrap, honouring explicit line breaks.
  const wrapped: string[][] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line: string[] = [];
    let lineWidth = 0;
    for (const word of words) {
      const w = measure(word);
      const next = line.length === 0 ? w : lineWidth + spaceWidth + w;
      if (line.length > 0 && next > maxWidth) {
        wrapped.push(line);
        line = [word];
        lineWidth = w;
      } else {
        line.push(word);
        lineWidth = next;
      }
    }
    if (line.length > 0) wrapped.push(line);
  }

  // 2. Position lines and units around the block centre.
  const lineHeightPx = fontPx * style.lineHeight;
  const lineWidths = wrapped.map((words) => measure(words.join(' ')));
  const blockWidth = Math.max(0, ...lineWidths);
  const blockHeight = wrapped.length * lineHeightPx;
  const units: LayoutUnit[] = [];
  const lines: LayoutLine[] = [];

  wrapped.forEach((words, lineIndex) => {
    const lineWidth = lineWidths[lineIndex];
    const y = -blockHeight / 2 + lineHeightPx * (lineIndex + 0.5);
    const lineX =
      style.align === 'left' ? -blockWidth / 2 : style.align === 'right' ? blockWidth / 2 - lineWidth : -lineWidth / 2;
    lines.push({ x: lineX, y, width: lineWidth });

    if (unit === 'line') {
      units.push({ text: words.join(' '), x: lineX, y, width: lineWidth, line: lineIndex });
      return;
    }
    let cursor = lineX;
    for (const word of words) {
      const wordWidth = measure(word);
      if (unit === 'word') {
        units.push({ text: word, x: cursor, y, width: wordWidth, line: lineIndex });
      } else {
        // Measure prefixes so per-letter placement keeps the font's kerning.
        for (let i = 0; i < word.length; i += 1) {
          const prefix = measure(word.slice(0, i));
          units.push({ text: word[i], x: cursor + prefix, y, width: measure(word[i]), line: lineIndex });
        }
      }
      cursor += wordWidth + spaceWidth;
    }
  });
  ctx.restore();

  const layout: TextLayout = { font, fontPx, lineHeightPx, units, lines, width: blockWidth, height: blockHeight };
  if (cache.size > CACHE_LIMIT) cache.clear();
  cache.set(key, layout);
  return layout;
}

/** Metrics measured with a fallback font are wrong once the real font arrives. */
export const clearTextLayoutCache = (): void => cache.clear();
