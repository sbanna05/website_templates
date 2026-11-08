import { clamp } from '../lib/math';
import type { LightEffect, LightType } from '../types/project';

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
  /** Intensity after the beat pulse. */
  k: number;
  /** Centre in local pixels. */
  cx: number;
  cy: number;
  /** Radius in local pixels. */
  r: number;
}

/** "#rrggbb" + alpha → rgba() */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value.padEnd(6, '0');
  const n = Number.parseInt(full.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(alpha, 0, 1)})`;
}

const radial = (ctx: Ctx, cx: number, cy: number, r: number, stops: [number, string][]) => {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
};

/**
 * Strategy table — one painter per light type. Everything is drawn with
 * additive-style blending ('screen'), so lights brighten the photo the way a
 * real lamp or lens flare would, rather than pasting a shape on top.
 */
const PAINTERS: Record<LightType, (c: LightContext) => void> = {
  /** Bloom: a blurred, brightened copy of the image itself, screened back on. */
  glow: ({ ctx, area, k, r }) => {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.filter = `blur(${Math.max(2, r * 0.12)}px) brightness(1.35)`;
    ctx.drawImage(area.source, area.sx, area.sy, area.sw, area.sh, area.x, area.y, area.width, area.height);
    ctx.filter = 'none';
  },

  /** Lamp / spotlight: darkens the surroundings and pools warm light around a point. */
  lamp: ({ ctx, area, light, k, cx, cy, r }) => {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = radial(ctx, cx, cy, r * 2.4, [
      [0, 'rgba(255,255,255,1)'],
      [0.45, 'rgba(255,255,255,1)'],
      [1, `rgba(${Math.round(255 * (1 - 0.6 * k))},${Math.round(255 * (1 - 0.6 * k))},${Math.round(255 * (1 - 0.55 * k))},1)`],
    ]);
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = radial(ctx, cx, cy, r, [
      [0, withAlpha(light.color, 0.85 * k)],
      [0.4, withAlpha(light.color, 0.35 * k)],
      [1, withAlpha(light.color, 0)],
    ]);
    ctx.fillRect(area.x, area.y, area.width, area.height);
  },

  /** Eclipse: a dark disc with a glowing corona ring. */
  eclipse: ({ ctx, area, light, k, cx, cy, r }) => {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = radial(ctx, cx, cy, r * 2.6, [
      [0, withAlpha(light.color, 0)],
      [0.36, withAlpha(light.color, 0.95 * k)],
      [0.42, withAlpha(light.color, 0.55 * k)],
      [0.7, withAlpha(light.color, 0.12 * k)],
      [1, withAlpha(light.color, 0)],
    ]);
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = radial(ctx, cx, cy, r * 0.95, [
      [0, `rgba(6, 9, 11, ${0.96 * Math.min(1, k + 0.2)})`],
      [0.92, `rgba(6, 9, 11, ${0.96 * Math.min(1, k + 0.2)})`],
      [1, 'rgba(6, 9, 11, 0)'],
    ]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  },

  /** Sun flare: hot core, halo, star streaks and a few ghosts along the flare axis. */
  flare: ({ ctx, area, light, k, cx, cy, r }) => {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = radial(ctx, cx, cy, r, [
      [0, withAlpha('#ffffff', 0.95 * k)],
      [0.12, withAlpha(light.color, 0.8 * k)],
      [0.5, withAlpha(light.color, 0.2 * k)],
      [1, withAlpha(light.color, 0)],
    ]);
    ctx.fillRect(area.x, area.y, area.width, area.height);
    const angle = (light.angle * Math.PI) / 180;
    for (const [spread, length, alpha] of [
      [0, 3.2, 0.5],
      [Math.PI / 2, 1.6, 0.25],
    ] as const) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + spread);
      const gradient = ctx.createLinearGradient(-r * length, 0, r * length, 0);
      gradient.addColorStop(0, withAlpha(light.color, 0));
      gradient.addColorStop(0.5, withAlpha('#ffffff', alpha * k));
      gradient.addColorStop(1, withAlpha(light.color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(-r * length, -r * 0.025, r * length * 2, r * 0.05);
      ctx.restore();
    }
    const ax = area.x + area.width / 2 - cx;
    const ay = area.y + area.height / 2 - cy;
    for (const [t, size, alpha] of [
      [0.7, 0.18, 0.18],
      [1.25, 0.32, 0.12],
      [1.7, 0.1, 0.2],
    ] as const) {
      const gx = cx + ax * t * 2;
      const gy = cy + ay * t * 2;
      ctx.fillStyle = radial(ctx, gx, gy, r * size, [
        [0, withAlpha(light.color, alpha * k)],
        [0.7, withAlpha(light.color, alpha * 0.6 * k)],
        [1, withAlpha(light.color, 0)],
      ]);
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
  },

  /** Light leak: a soft, warm wash bleeding in from an edge. */
  leak: ({ ctx, area, light, k, cx, cy, r }) => {
    ctx.globalCompositeOperation = 'screen';
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((light.angle * Math.PI) / 180);
    ctx.scale(1.8, 0.8);
    ctx.fillStyle = radial(ctx, 0, 0, r * 1.4, [
      [0, withAlpha(light.color, 0.85 * k)],
      [0.5, withAlpha(light.color, 0.35 * k)],
      [1, withAlpha(light.color, 0)],
    ]);
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
    ctx.restore();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = withAlpha(light.color, 0.25 * k);
    ctx.fillRect(area.x, area.y, area.width, area.height);
  },

  /** Volumetric beam: a soft cone of light, like a window shaft or stage lamp. */
  beam: ({ ctx, area, light, k, cx, cy, r }) => {
    ctx.globalCompositeOperation = 'screen';
    const length = Math.hypot(area.width, area.height) * 1.2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((light.angle * Math.PI) / 180);
    ctx.filter = `blur(${Math.max(2, r * 0.25)}px)`;
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, withAlpha(light.color, 0.75 * k));
    gradient.addColorStop(0.6, withAlpha(light.color, 0.18 * k));
    gradient.addColorStop(1, withAlpha(light.color, 0));
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

/** Paints the clip's lights, clipped to the image rectangle. `pulse` is the beat envelope (0–1). */
export function drawLights(ctx: Ctx, lights: readonly LightEffect[], area: LightArea, pulse: number): void {
  if (lights.length === 0) return;
  const shortSide = Math.min(area.width, area.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  for (const light of lights) {
    ctx.save();
    PAINTERS[light.type]({
      ctx,
      area,
      light,
      k: clamp(light.intensity * (light.pulseOnBeat ? 0.55 + 0.9 * pulse : 1), 0, 1.4),
      cx: area.x + light.x * area.width,
      cy: area.y + light.y * area.height,
      r: light.size * shortSide,
    });
    ctx.restore();
  }
  ctx.restore();
}
