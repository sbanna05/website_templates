import { spanOf } from '../engine/merge';
import { encodeWav } from '../lib/wav';
import type { Asset, AudioClip, Project } from '../types/project';
import { collectMixSources, ensureMixBuffers, scheduleMix } from './mixer';

const BOUNCE_RATE = 48000;

/**
 * Renders music clips — with their speed, pitch, stems, EQ, effects, fades and
 * volume curves baked in — into one stereo WAV, starting at the first clip.
 * The master bus is left out: it still applies when the merged file plays.
 */
export async function bounceClips(project: Project, assets: Record<string, Asset>, clips: readonly AudioClip[], name: string): Promise<File> {
  const { start, end } = spanOf(clips);
  const solo: Project = {
    ...project,
    tracks: project.tracks.map((t) => ({ ...t, muted: false })),
    clips: clips.map((c) => ({ ...c, start: c.start - start })),
  };
  const sources = collectMixSources(solo, assets);
  await ensureMixBuffers(sources);
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil((end - start) * BOUNCE_RATE)), BOUNCE_RATE);
  scheduleMix(ctx, ctx.destination, sources, 0, 0);
  const rendered = await ctx.startRendering();
  const wav = encodeWav([rendered.getChannelData(0), rendered.getChannelData(1)], BOUNCE_RATE);
  return new File([wav], name, { type: 'audio/wav' });
}
