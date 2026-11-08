import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import { collectMixSources, ensureMixBuffers, scheduleMix } from '../audio/mixer';
import { frameSizeFor } from '../config/canvas';
import { cssFont } from '../config/fonts';
import { renderFrame } from '../engine/renderFrame';
import { projectDuration, timelineBeats } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { ExportFrames } from './exportFrames';

export type ExportQuality = 'medium' | 'high' | 'very-high';

export interface ExportSettings {
  shortSide: 720 | 1080 | 1440;
  fps: 24 | 30 | 60;
  quality: ExportQuality;
}

export type ExportPhase = 'preparing' | 'audio' | 'video' | 'finalizing';

export interface ExportProgress {
  phase: ExportPhase;
  /** 0–1 overall. */
  progress: number;
}

const QUALITY = { medium: QUALITY_MEDIUM, high: QUALITY_HIGH, 'very-high': QUALITY_VERY_HIGH } as const;
const SAMPLE_RATE = 48000;

export const isExportSupported = (): boolean =>
  typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

async function loadFonts(project: Project): Promise<void> {
  const fonts = new Set(
    project.clips.flatMap((c) => (c.kind === 'text' ? [cssFont(c.style.fontFamily, c.style.fontWeight, 40, c.style.italic)] : [])),
  );
  await Promise.all([...fonts].map((font) => document.fonts.load(font)));
}

async function renderAudioMix(project: Project, assets: Record<string, Asset>, duration: number): Promise<AudioBuffer | null> {
  const sources = collectMixSources(project, assets);
  if (sources.length === 0) return null;
  await ensureMixBuffers(sources);
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  scheduleMix(ctx, ctx.destination, sources, 0, 0);
  return ctx.startRendering();
}

/** Copies one second-long window of a rendered mix, for interleaving with video frames. */
function sliceAudio(buffer: AudioBuffer, from: number, to: number): AudioBuffer {
  const start = Math.floor(from * buffer.sampleRate);
  const end = Math.min(buffer.length, Math.floor(to * buffer.sampleRate));
  const slice = new AudioBuffer({ length: Math.max(1, end - start), numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    slice.copyToChannel(buffer.getChannelData(c).subarray(start, end), c);
  }
  return slice;
}

/**
 * Renders the project to an MP4 entirely in the browser:
 * canvas frames → WebCodecs H.264 (or best available) + AAC/Opus → MP4 muxer.
 */
export async function exportVideo(
  project: Project,
  assets: Record<string, Asset>,
  settings: ExportSettings,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  if (!isExportSupported()) {
    throw new Error('MP4 export needs WebCodecs. Use a recent Chrome, Edge or Safari.');
  }
  const { width, height } = frameSizeFor(project.aspect, settings.shortSide);
  const { fps } = settings;
  const duration = projectDuration(project);
  const totalFrames = Math.ceil(duration * fps);

  onProgress({ phase: 'preparing', progress: 0 });
  await loadFonts(project);

  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, frameRate: fps });
  if (!videoCodec) throw new Error(`Your browser can't encode ${width}×${height} video. Try a lower resolution.`);

  onProgress({ phase: 'audio', progress: 0.02 });
  const mix = await renderAudioMix(project, assets, duration);
  const audioCodec = mix ? await getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: 2, sampleRate: SAMPLE_RATE }) : null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not create a 2D canvas.');

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, quality: QUALITY[settings.quality], keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: fps });
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY[settings.quality] }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  const frames = await ExportFrames.create(project, fps, totalFrames);
  const beats = timelineBeats(project, assets);
  let audioWritten = 0;

  try {
    for (let f = 0; f < totalFrames; f += 1) {
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      const time = f / fps;

      // Keep audio ~1 s ahead of video so the muxer can interleave.
      while (audioSource && mix && audioWritten < Math.min(duration, time + 1)) {
        const next = Math.min(duration, audioWritten + 1);
        await audioSource.add(sliceAudio(mix, audioWritten, next));
        audioWritten = next;
      }

      await frames.prepare(time);
      renderFrame(ctx, { project, assets, time, width, height, frames, beats });
      await videoSource.add(time, 1 / fps);
      if (f % 3 === 0) onProgress({ phase: 'video', progress: 0.05 + 0.9 * (f / totalFrames) });
    }

    onProgress({ phase: 'finalizing', progress: 0.97 });
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  } finally {
    await frames.dispose();
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error('Export produced no data.');
  onProgress({ phase: 'finalizing', progress: 1 });
  return new Blob([buffer], { type: 'video/mp4' });
}
