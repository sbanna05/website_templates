import { getEase } from '../lib/easing';
import { clamp, seededRandom } from '../lib/math';
import type { BeatFxType, Filters, VisualClip } from '../types/project';
import { beatStateAt, type BeatState } from './beats';
import { drawLights } from './drawLights';
import { MOTIONS, pacedProgress } from './motion';
import { TRANSITIONS, type TransitionPose } from './transitions';
import { IDENTITY_POSE, combinePoses, type Hitbox, type Pose, type RenderEnv } from './types';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function sourceSize(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  if (typeof VideoFrame !== 'undefined' && source instanceof VideoFrame) {
    return { width: source.displayWidth, height: source.displayHeight };
  }
  const sized = source as { width: number | SVGAnimatedLength; height: number | SVGAnimatedLength };
  return {
    width: typeof sized.width === 'number' ? sized.width : sized.width.baseVal.value,
    height: typeof sized.height === 'number' ? sized.height : sized.height.baseVal.value,
  };
}

interface BeatFxPose extends Partial<Pose> {
  flash?: number;
  brightness?: number;
}

const BEAT_FX: Record<BeatFxType, (b: BeatState, intensity: number, width: number) => BeatFxPose> = {
  none: () => ({}),
  'zoom-pulse': (b, k) => ({ scale: 1 + 0.14 * k * b.pulse }),
  flash: (b, k) => ({ flash: 0.55 * k * b.pulse }),
  shake: (b, k, w) => ({
    dx: (seededRandom(b.index * 19) - 0.5) * w * 0.05 * k * b.pulse,
    dy: (seededRandom(b.index * 23 + 1) - 0.5) * w * 0.05 * k * b.pulse,
  }),
  'blur-pulse': (b, k, w) => ({ blur: w * 0.012 * k * b.pulse }),
  brightness: (b, k) => ({ brightness: 1 + 0.6 * k * b.pulse }),
  tilt: (b, k) => ({ rotation: (b.index % 2 === 0 ? 1 : -1) * 0.06 * k * b.pulse, scale: 1 + 0.06 * k * b.pulse }),
};

const FLASH_COLOR = '#eef2f3';

/** Colour grading that canvas `filter` can't express: white balance and a matte fade. */
function gradeImage(ctx: Ctx, filters: Filters, x: number, y: number, w: number, h: number): void {
  const overlays: [GlobalCompositeOperation, string, number][] = [];
  if (filters.temperature) {
    overlays.push(['soft-light', filters.temperature > 0 ? '#f0a352' : '#4f8fd6', Math.abs(filters.temperature) * 0.6]);
  }
  if (filters.tint) overlays.push(['soft-light', filters.tint > 0 ? '#c25bb4' : '#4fae62', Math.abs(filters.tint) * 0.45]);
  if (filters.fade) overlays.push(['lighten', '#3a4247', filters.fade * 0.9]);
  for (const [mode, color, alpha] of overlays) {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha *= clamp(alpha, 0, 1);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

export function drawVisualClip(ctx: Ctx, clip: VisualClip, source: CanvasImageSource, env: RenderEnv): Hitbox {
  const { width: W, height: H } = env;
  const local = env.time - clip.start;
  const { transform, filters, crop } = clip;

  // Crop (normalised source rect), then fit the cropped region into the frame.
  const src = sourceSize(source);
  const sx = crop.x * src.width;
  const sy = crop.y * src.height;
  const sw = Math.max(1, crop.width * src.width);
  const sh = Math.max(1, crop.height * src.height);
  const ratio = clip.fit === 'cover' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
  const drawW = sw * ratio;
  const drawH = sh * ratio;

  const paced = pacedProgress(clip.motionCurve, local, clip.duration, clip.start, env.beats);
  const motion = MOTIONS[clip.motion](paced, clip.motionAmount, W, H, env.time);
  const inProgress = clip.transitionIn.duration > 0 ? clamp(local / clip.transitionIn.duration, 0, 1) : 1;
  const outProgress =
    clip.transitionOut.duration > 0 ? clamp((clip.duration - local) / clip.transitionOut.duration, 0, 1) : 1;
  const ease = getEase('power3.out');
  const tin: TransitionPose = TRANSITIONS[clip.transitionIn.type](ease(inProgress), W, H);
  const tout: TransitionPose = TRANSITIONS[clip.transitionOut.type](ease(outProgress), W, H);
  const beatState = beatStateAt(env.beats, env.time);
  const beat = BEAT_FX[clip.beatFx.type](beatState, clip.beatFx.intensity, W);

  const pose = combinePoses(IDENTITY_POSE, motion, tin, tout, beat);
  const brightness = filters.brightness * (beat.brightness ?? 1);
  const blur = filters.blur * env.unit + pose.blur;
  const opacity = clamp(transform.opacity * pose.opacity, 0, 1);
  const cx = W / 2 + transform.x * W + pose.dx;
  const cy = H / 2 + transform.y * H + pose.dy;
  const scale = transform.scale * pose.scale;
  const rotation = (transform.rotation * Math.PI) / 180 + pose.rotation;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(scale * pose.scaleX * (clip.flipX ? -1 : 1), scale * pose.scaleY * (clip.flipY ? -1 : 1));
  ctx.filter = [
    `brightness(${brightness})`,
    `contrast(${filters.contrast})`,
    `saturate(${filters.saturation})`,
    filters.hue ? `hue-rotate(${filters.hue}deg)` : '',
    blur > 0.2 ? `blur(${blur}px)` : '',
  ].join(' ');
  const x = -drawW / 2;
  const y = -drawH / 2;
  ctx.drawImage(source, sx, sy, sw, sh, x, y, drawW, drawH);
  ctx.filter = 'none';
  gradeImage(ctx, filters, x, y, drawW, drawH);
  drawLights(ctx, clip.lights, { x, y, width: drawW, height: drawH, source, sx, sy, sw, sh }, beatState.pulse);
  ctx.restore();

  if (filters.vignette > 0) {
    const gradient = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) / 2);
    gradient.addColorStop(0, 'rgba(5, 8, 10, 0)');
    gradient.addColorStop(1, `rgba(5, 8, 10, ${filters.vignette * opacity})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  const flash = Math.max(tin.flash ?? 0, tout.flash ?? 0) + (beat.flash ?? 0);
  if (flash > 0.001) {
    ctx.save();
    ctx.globalAlpha = clamp(flash, 0, 1);
    ctx.fillStyle = FLASH_COLOR;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  return {
    clipId: clip.id,
    cx,
    cy,
    width: drawW * scale * Math.abs(pose.scaleX),
    height: drawH * scale * Math.abs(pose.scaleY),
    rotation,
  };
}
