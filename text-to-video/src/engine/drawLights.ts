import { clamp } from '../lib/math';
import type { LightBlend, LightEffect, LightType } from '../types/project';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** The image rectangle the lights are painted into, in the clip's local (already transformed) space. */
export interface LightArea {
  x: number;
  y: number;
  width: number;
  height: number;
  source: CanvasImageSource;
  /** Source rectangle (crop) used to redraw the image for bloom. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

interface LightContext {
  ctx: Ctx;
  area: LightArea;
  light: LightEffect;
  /** Intensity after the beat pulse and animation. */
  k: number;
  /** Radius in local pixels. The painter draws around (0, 0) — the light's centre. */
  r: number;
  /** Angle in radians (after a spin animation). */
  angle: number;
  /** Vector from the light to the image centre, for flare ghosts. */
  toCenter: { x: number; y: number };
  /** Composite mode for the light's glow (the user's blend choice, or screen). */
  glowMode: GlobalCompositeOperation;
  /** Colour at `t` (0 = core … 1 = outer edge) with alpha. */
  tone: (t: number, alpha: number) => string;
  /** Radial gradient centred on the light, stops reshaped by the softness. */
  radial: (cx: number, cy: number, r: number, stops: [number, string][]) => CanvasGradient;
}

/** "#rrggbb" + alpha → rgba() */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function rgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value.padEnd(6, '0');
  const n = Number.parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixColor(a: string, b: string, t: number, alpha: number): string {
  const ca = rgb(a);
  const cb = rgb(b);
  const m = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * t);
  return `rgba(${m(0)}, ${m(1)}, ${m(2)}, ${clamp(alpha, 0, 1)})`;
}

const BIG = 1e5;
/** Fills everything; the clip rectangle set up in `drawLights` keeps it on the picture. */
const fillAll = (ctx: Ctx) => ctx.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);

const BLEND: Record<Exclude<LightBlend, 'auto'>, GlobalCompositeOperation> = {
  add: 'lighter',
  screen: 'screen',
  overlay: 'overlay',
  'soft-light': 'soft-light',
  'color-dodge': 'color-dodge',
};

/**
 * Strategy table — one painter per light type, drawing around (0, 0). Glows
 * use additive-style blending, so lights brighten the photo the way a real lamp
 * or lens flare would, rather than pasting a shape on top.
 */
const PAINTERS: Record<LightType, (c: LightContext) => void> = {
  /** Bloom: a blurred, brightened copy of the image itself, screened back on, plus an optional colour wash. */
  glow: ({ ctx, area, light, k, r, glowMode, radial }) => {
    ctx.globalCompositeOperation = glowMode;
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.filter = `blur(${Math.max(2, r * (0.04 + light.softness * 0.2))}px) brightness(1.35)`;
    ctx.drawImage(area.source, area.sx, area.sy, area.sw, area.sh, area.x, area.y, area.width, area.height);
    ctx.filter = 'none';
    if (light.color.toLowerCase() !== '#ffffff') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = radial(0, 0, r * 2.2, [
        [0, withAlpha(light.color, 0.35 * k)],
        [1, withAlpha(light.color2, 0)],
      ]);
      fillAll(ctx);
    }
  },

  /** Halo: a glowing ring with an open centre — rim light, angel ring, neon circle. */
  halo: ({ ctx, k, r, glowMode, tone, light }) => {
    ctx.globalCompositeOperation = glowMode;
    const width = 0.06 + light.softness * 0.5;
    const inner = Math.max(0, 1 - width);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r * (1 + width)));
    const end = 1 + width;
    gradient.addColorStop(0, tone(0, 0));
    gradient.addColorStop(clamp(inner / end, 0, 1), tone(0.2, 0));
    gradient.addColorStop(clamp(1 / end, 0, 1), tone(0, 0.95 * k));
    gradient.addColorStop(clamp((1 + width * 0.4) / end, 0, 1), tone(0.6, 0.35 * k));
    gradient.addColorStop(1, tone(1, 0));
    ctx.fillStyle = gradient;
    fillAll(ctx);
  },

  /** Lamp / spotlight: darkens the surroundings and pools light around a point. */
  lamp: ({ ctx, k, r, glowMode, tone, radial }) => {
    ctx.globalCompositeOperation = 'multiply';
    const dim = (f: number) => Math.round(255 * (1 - f * k));
    ctx.fillStyle = radial(0, 0, r * 2.4, [
      [0, 'rgba(255,255,255,1)'],
      [0.45, 'rgba(255,255,255,1)'],
      [1, `rgba(${dim(0.6)},${dim(0.6)},${dim(0.55)},1)`],
    ]);
    fillAll(ctx);
    ctx.globalCompositeOperation = glowMode;
    ctx.fillStyle = radial(0, 0, r, [
      [0, tone(0, 0.85 * k)],
      [0.4, tone(0.4, 0.35 * k)],
      [1, tone(1, 0)],
    ]);
    fillAll(ctx);
  },

  /** Eclipse: a dark disc with a glowing corona ring. */
  eclipse: ({ ctx, k, r, glowMode, tone, radial }) => {
    ctx.globalCompositeOperation = glowMode;
    ctx.fillStyle = radial(0, 0, r * 2.6, [
      [0, tone(0, 0)],
      [0.36, tone(0.1, 0.95 * k)],
      [0.42, tone(0.3, 0.55 * k)],
      [0.7, tone(0.7, 0.12 * k)],
      [1, tone(1, 0)],
    ]);
    fillAll(ctx);
    ctx.globalCompositeOperation = 'source-over';
    const disc = `rgba(6, 9, 11, ${0.96 * Math.min(1, k + 0.2)})`;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r * 0.95));
    g.addColorStop(0, disc);
    g.addColorStop(0.92, disc);
    g.addColorStop(1, 'rgba(6, 9, 11, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  },

  /** Sun flare: hot core, halo, star streaks and a few ghosts along the flare axis. */
  flare: ({ ctx, k, r, angle, toCenter, glowMode, tone, radial }) => {
    ctx.globalCompositeOperation = glowMode;
    ctx.fillStyle = radial(0, 0, r, [
      [0, withAlpha('#ffffff', 0.95 * k)],
      [0.12, tone(0.1, 0.8 * k)],
      [0.5, tone(0.5, 0.2 * k)],
      [1, tone(1, 0)],
    ]);
    fillAll(ctx);
    for (const [spread, length, alpha] of [
      [0, 3.2, 0.5],
      [Math.PI / 2, 1.6, 0.25],
    ] as const) {
      ctx.save();
      ctx.rotate(angle + spread);
      const gradient = ctx.createLinearGradient(-r * length, 0, r * length, 0);
      gradient.addColorStop(0, tone(1, 0));
      gradient.addColorStop(0.5, withAlpha('#ffffff', alpha * k));
      gradient.addColorStop(1, tone(1, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(-r * length, -r * 0.025, r * length * 2, r * 0.05);
      ctx.restore();
    }
    for (const [t, size, alpha] of [
      [0.7, 0.18, 0.18],
      [1.25, 0.32, 0.12],
      [1.7, 0.1, 0.2],
    ] as const) {
      const gx = toCenter.x * t * 2;
      const gy = toCenter.y * t * 2;
      ctx.fillStyle = radial(gx, gy, r * size, [
        [0, tone(t / 2, alpha * k)],
        [0.7, tone(t / 2, alpha * 0.6 * k)],
        [1, tone(1, 0)],
      ]);
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
  },

  /** Light leak: a soft wash bleeding in from an edge. */
  leak: ({ ctx, light, k, r, angle, glowMode, tone, radial }) => {
    ctx.globalCompositeOperation = glowMode;
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(1.8, 0.8);
    ctx.fillStyle = radial(0, 0, r * 1.4, [
      [0, tone(0, 0.85 * k)],
      [0.5, tone(0.5, 0.35 * k)],
      [1, tone(1, 0)],
    ]);
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
    ctx.restore();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = withAlpha(light.color2, 0.25 * k);
    fillAll(ctx);
  },

  /** Volumetric beam: a soft cone of light, like a window shaft or stage lamp. */
  beam: ({ ctx, area, light, k, r, angle, glowMode, tone }) => {
    ctx.globalCompositeOperation = glowMode;
    const length = Math.hypot(area.width, area.height) * 1.2;
    ctx.save();
    ctx.rotate(angle);
    ctx.filter = `blur(${Math.max(2, r * (0.05 + light.softness * 0.4))}px)`;
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, tone(0, 0.75 * k));
    gradient.addColorStop(0.6, tone(0.6, 0.18 * k));
    gradient.addColorStop(1, tone(1, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.15);
    ctx.lineTo(length, -r * 1.6);
    ctx.lineTo(length, r * 1.6);
    ctx.lineTo(0, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  },
};

/** Light types whose shape follows the angle (the others use it only for stretch and spin). */
export const ANGLED_LIGHTS: readonly LightType[] = ['flare', 'leak', 'beam'];

/** Brightness, size and position changes from the light's own animation at `time` seconds. */
export function animateLight(light: LightEffect, time: number): { k: number; r: number; dx: number; dy: number; spin: number } {
  const t = time * (light.speed || 1);
  switch (light.animation) {
    case 'pulse':
      return { k: 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)), r: 1, dx: 0, dy: 0, spin: 0 };
    case 'flicker': {
      const n = Math.sin(t * 23.1) * 0.5 + Math.sin(t * 37.7 + 1.3) * 0.3 + Math.sin(t * 61.3 + 2.1) * 0.2;
      return { k: 0.78 + 0.22 * n, r: 1, dx: 0, dy: 0, spin: 0 };
    }
    case 'breathe':
      return { k: 1, r: 1 + 0.18 * Math.sin(t * Math.PI * 0.8), dx: 0, dy: 0, spin: 0 };
    case 'drift':
      return { k: 1, r: 1, dx: Math.sin(t * 0.9) * 0.06, dy: Math.cos(t * 0.63) * 0.045, spin: 0 };
    case 'spin':
      return { k: 1, r: 1, dx: 0, dy: 0, spin: t * Math.PI * 0.5 };
    default:
      return { k: 1, r: 1, dx: 0, dy: 0, spin: 0 };
  }
}

/**
 * Paints the clip's lights, clipped to the image rectangle. `pulse` is the
 * beat envelope (0–1); `time` drives the lights' own animation.
 */
export function drawLights(ctx: Ctx, lights: readonly LightEffect[], area: LightArea, pulse: number, time = 0): void {
  if (lights.length === 0) return;
  const shortSide = Math.min(area.width, area.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  for (const light of lights) {
    const anim = animateLight(light, time);
    const cx = area.x + (light.x + anim.dx) * area.width;
    const cy = area.y + (light.y + anim.dy) * area.height;
    const angle = (light.angle * Math.PI) / 180 + anim.spin;
    const stretch = clamp(light.stretch || 1, 0.2, 5);
    // Softness reshapes every radial falloff: < 0.5 pushes the stops out (hard edge), > 0.5 pulls them in.
    const power = 2 ** ((clamp(light.softness ?? 0.5, 0, 1) - 0.5) * 2.4);
    const color2 = light.color2 || light.color;

    ctx.save();
    ctx.translate(cx, cy);
    if (stretch !== 1 && light.type !== 'glow') {
      ctx.rotate(angle);
      ctx.scale(stretch, 1 / Math.sqrt(stretch));
      ctx.rotate(-angle);
    }
    const ac = { ...light, color2 };
    PAINTERS[light.type]({
      ctx,
      area: { ...area, x: area.x - cx, y: area.y - cy },
      light: ac,
      k: clamp(light.intensity * anim.k * (light.pulseOnBeat ? 0.55 + 0.9 * pulse : 1), 0, 1.6),
      r: light.size * shortSide * anim.r,
      angle,
      toCenter: { x: area.x + area.width / 2 - cx, y: area.y + area.height / 2 - cy },
      glowMode: light.blend && light.blend !== 'auto' ? BLEND[light.blend] : 'screen',
      tone: (t, alpha) => (color2 === light.color ? withAlpha(light.color, alpha) : mixColor(light.color, color2, clamp(t, 0, 1), alpha)),
      radial: (gx, gy, r, stops) => {
        const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(1, r));
        for (const [offset, color] of stops) gradient.addColorStop(offset <= 0 || offset >= 1 ? offset : offset ** power, color);
        return gradient;
      },
    });
    ctx.restore();
  }
  ctx.restore();
}
