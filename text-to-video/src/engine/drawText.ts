import { getEase } from '../lib/easing';
import { clamp } from '../lib/math';
import type { TextClip } from '../types/project';
import { beatStateAt, beatsFrom } from './beats';
import { IN_ANIMATIONS, LOOP_ANIMATIONS, OUT_ANIMATIONS, type UnitPose } from './textAnimations';
import { applyFont, layoutText } from './textLayout';
import { IDENTITY_POSE, combinePoses, type Hitbox, type RenderEnv } from './types';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const SPLIT_COLORS = ['rgba(107, 151, 184, 0.85)', 'rgba(122, 166, 142, 0.85)'] as const;

/** When each unit starts animating in, relative to the clip start. */
function unitStartTimes(clip: TextClip, count: number, beats: readonly number[]): number[] {
  const { stagger, revealOnBeat } = clip.animation;
  if (!revealOnBeat) return Array.from({ length: count }, (_, i) => i * stagger);
  const onBeat = beatsFrom(beats, clip.start, count).map((b) => b - clip.start);
  const gap = onBeat.length > 1 ? onBeat[onBeat.length - 1] - onBeat[onBeat.length - 2] : stagger || 0.25;
  const fallbackStart = onBeat.length > 0 ? onBeat[onBeat.length - 1] : 0;
  return Array.from({ length: count }, (_, i) =>
    i < onBeat.length ? onBeat[i] : fallbackStart + (i - onBeat.length + 1) * gap,
  );
}

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
}

export function drawTextClip(ctx: Ctx, clip: TextClip, env: RenderEnv): Hitbox {
  const { style, animation, transform } = clip;
  const layout = layoutText(ctx, clip.text, style, animation.unit, env.width, env.unit);
  const local = env.time - clip.start;
  const ease = getEase(animation.ease);
  const starts = unitStartTimes(clip, layout.units.length, env.beats);
  const outDuration = Math.min(animation.outDuration, clip.duration / 2);
  const outQ = animation.out === 'none' ? 0 : clamp((local - (clip.duration - outDuration)) / outDuration, 0, 1);
  const outPose = OUT_ANIMATIONS[animation.out](getEase('power2.in')(outQ), layout.fontPx);
  const beat = beatStateAt(env.beats, env.time);
  const letterSpacingPx = style.letterSpacing * env.unit;

  const cx = env.width / 2 + transform.x * env.width;
  const cy = env.height / 2 + transform.y * env.height;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scale, transform.scale);
  ctx.globalAlpha = transform.opacity;
  applyFont(ctx, layout, letterSpacingPx);
  ctx.lineJoin = 'round';

  // Resolve every unit's pose up front: the line backgrounds need them too.
  const poses = layout.units.map((_unit, i) => {
    const since = local - starts[i];
    const raw = since / Math.max(animation.inDuration, 0.001);
    const span = (starts[i + 1] ?? clip.duration - outDuration) - starts[i];
    const inPose = IN_ANIMATIONS[animation.in](ease(clamp(raw, 0, 1)), {
      raw,
      since,
      span,
      fontPx: layout.fontPx,
      seed: i * 97 + clip.start * 13,
      time: local,
    });
    const loopPose = since >= 0 ? LOOP_ANIMATIONS[animation.loop]({ time: local, index: i, fontPx: layout.fontPx, beat }) : {};
    return { ...combinePoses(IDENTITY_POSE, inPose, loopPose, outPose), extra: merge(inPose, loopPose) };
  });

  // TikTok-style backgrounds: one rounded box per line, fading with its words.
  if (style.background !== 'none') {
    const padX = layout.fontPx * 0.32;
    const padY = layout.fontPx * 0.12;
    layout.lines.forEach((line, lineIndex) => {
      const alpha = Math.max(0, ...poses.filter((_, i) => layout.units[i].line === lineIndex).map((p) => p.opacity));
      if (alpha <= 0.001) return;
      ctx.save();
      ctx.globalAlpha *= clamp(alpha, 0, 1);
      ctx.fillStyle = style.backgroundColor;
      const h = layout.lineHeightPx + padY * 2 - layout.fontPx * 0.08;
      roundedRect(ctx, line.x - padX, line.y - h / 2, line.width + padX * 2, h, style.background === 'pill' ? h / 2 : h * 0.18);
      ctx.fill();
      ctx.restore();
    });
  }

  layout.units.forEach((unit, i) => {
    const pose = poses[i];
    if (pose.opacity <= 0.001) return;
    const text = pose.extra.reveal !== undefined ? unit.text.slice(0, Math.ceil(pose.extra.reveal * unit.text.length)) : unit.text;
    if (!text) return;

    ctx.save();
    ctx.translate(unit.x + unit.width / 2 + pose.dx, unit.y + pose.dy);
    ctx.rotate(pose.rotation);
    ctx.scale(pose.scale * pose.scaleX, pose.scale * pose.scaleY);
    ctx.globalAlpha *= clamp(pose.opacity, 0, 1);
    if (pose.blur > 0.3) ctx.filter = `blur(${pose.blur}px)`;
    const x = -unit.width / 2;

    const split = pose.extra.split ?? 0;
    if (split > 0.01) {
      const offset = layout.fontPx * 0.07 * split;
      SPLIT_COLORS.forEach((color, k) => {
        ctx.fillStyle = color;
        ctx.fillText(text, x + (k === 0 ? -offset : offset), 0);
      });
    }

    if (style.shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = style.shadowBlur * env.unit;
      ctx.shadowOffsetY = style.shadowBlur * env.unit * 0.25;
    }
    if (style.strokeWidth > 0) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * 2 * env.unit;
      ctx.strokeText(text, x, 0);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = (pose.extra.highlight ?? 0) > 0.5 ? style.highlightColor : style.color;
    ctx.fillText(text, x, 0);
    ctx.restore();
  });
  ctx.restore();

  const pad = layout.fontPx * 0.3;
  return {
    clipId: clip.id,
    cx,
    cy,
    width: (layout.width + pad * 2) * transform.scale,
    height: (layout.height + pad) * transform.scale,
    rotation: (transform.rotation * Math.PI) / 180,
  };
}

function merge(...poses: UnitPose[]): UnitPose {
  const out: UnitPose = {};
  for (const pose of poses) {
    if (pose.reveal !== undefined) out.reveal = Math.min(out.reveal ?? 1, pose.reveal);
    if (pose.highlight !== undefined) out.highlight = Math.max(out.highlight ?? 0, pose.highlight);
    if (pose.split !== undefined) out.split = Math.max(out.split ?? 0, pose.split);
  }
  return out;
}
