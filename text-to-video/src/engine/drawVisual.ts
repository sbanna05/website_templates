import { getEase } from '../lib/easing';
import { clamp, seededRandom } from '../lib/math';
import type { BeatFxType, MotionType, VisualClip } from '../types/project';
import { beatStateAt, type BeatState } from './beats';
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

/** Ken Burns style motion over the clip's lifetime; `m` runs 0 → 1. */
const MOTIONS: Record<MotionType, (m: number, amount: number, width: number) => Partial<Pose>> = {
  none: () => ({}),
  'zoom-in': (m, a) => ({ scale: 1 + a * m }),
  'zoom-out': (m, a) => ({ scale: 1 + a * (1 - m) }),
  'pan-left': (m, a, w) => ({ scale: 1 + a, dx: (0.5 - m) * a * w }),
  'pan-right': (m, a, w) => ({ scale: 1 + a, dx: (m - 0.5) * a * w }),
  drift: (m, a, w) => ({ scale: 1 + a * 0.6, dx: Math.sin(m * Math.PI * 2) * a * w * 0.15, rotation: Math.sin(m * Math.PI) * a * 0.1 }),
};

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

export function drawVisualClip(ctx: Ctx, clip: VisualClip, source: CanvasImageSource, env: RenderEnv): Hitbox {
  const { width: W, height: H } = env;
  const local = env.time - clip.start;
  const { transform, filters } = clip;

  // Fit the source into the frame.
  const src = sourceSize(source);
  const ratio = clip.fit === 'cover' ? Math.max(W / src.width, H / src.height) : Math.min(W / src.width, H / src.height);
  const drawW = src.width * ratio;
  const drawH = src.height * ratio;

  const motion = MOTIONS[clip.motion](clamp(local / clip.duration, 0, 1), clip.motionAmount, W);
  const inProgress = clip.transitionIn.duration > 0 ? clamp(local / clip.transitionIn.duration, 0, 1) : 1;
  const outProgress = clip.transitionOut.duration > 0 ? clamp((clip.duration - local) / clip.transitionOut.duration, 0, 1) : 1;
  const ease = getEase('power3.out');
  const tin: TransitionPose = TRANSITIONS[clip.transitionIn.type](ease(inProgress), W, H);
  const tout: TransitionPose = TRANSITIONS[clip.transitionOut.type](ease(outProgress), W, H);
  const beat = BEAT_FX[clip.beatFx.type](beatStateAt(env.beats, env.time), clip.beatFx.intensity, W);

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
  ctx.scale(scale, scale);
  ctx.filter = [
    `brightness(${brightness})`,
    `contrast(${filters.contrast})`,
    `saturate(${filters.saturation})`,
    filters.hue ? `hue-rotate(${filters.hue}deg)` : '',
    blur > 0.2 ? `blur(${blur}px)` : '',
  ].join(' ');
  ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
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

  return { clipId: clip.id, cx, cy, width: drawW * scale, height: drawH * scale, rotation };
}
