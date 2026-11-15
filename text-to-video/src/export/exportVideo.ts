import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type AudioCodec,
  type OutputFormat,
  type VideoCodec,
} from 'mediabunny';
import { frameSizeFor } from '../config/canvas';
import { projectDuration } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { EXPORT_FORMATS, EXPORT_SAMPLE_RATE, type ProgressCallback, type VideoExportSettings, type VideoFormatId } from './formats';
import { TimelineRenderer, renderAudioMix, sliceAudio, throwIfAborted } from './shared';

interface ContainerSpec {
  create: () => OutputFormat;
  /** Codecs in order of preference (compatibility first). */
  video: VideoCodec[];
  audio: AudioCodec[];
}

const CONTAINERS: Record<VideoFormatId, ContainerSpec> = {
  mp4: { create: () => new Mp4OutputFormat({ fastStart: 'in-memory' }), video: ['avc', 'hevc', 'vp9', 'av1'], audio: ['aac', 'opus'] },
  mov: { create: () => new MovOutputFormat({ fastStart: 'in-memory' }), video: ['avc', 'hevc'], audio: ['aac'] },
  webm: { create: () => new WebMOutputFormat(), video: ['vp9', 'av1', 'vp8'], audio: ['opus', 'vorbis'] },
};

export const isVideoExportSupported = (): boolean =>
  typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

/**
 * Renders the project to a video file entirely in the browser:
 * canvas frames → WebCodecs video + audio encoders → MP4 / MOV / WebM muxer.
 */
export async function exportVideo(
  project: Project,
  assets: Record<string, Asset>,
  settings: VideoExportSettings,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<Blob> {
  const info = EXPORT_FORMATS[settings.format];
  if (!isVideoExportSupported()) {
    throw new Error(`${info.label} export needs WebCodecs. Use a recent Chrome, Edge or Safari.`);
  }
  const container = CONTAINERS[settings.format];
  const { width, height } = frameSizeFor(project.aspect, settings.shortSide);
  const { fps } = settings;
  const duration = projectDuration(project);
  const totalFrames = Math.ceil(duration * fps);
  if (totalFrames === 0) throw new Error('The timeline is empty — add a clip first.');
  const quality = new Quality(settings.quality);

  onProgress({ phase: 'preparing', progress: 0 });
  const videoCodec = await getFirstEncodableVideoCodec(container.video, { width, height, frameRate: fps });
  if (!videoCodec) throw new Error(`Your browser can't encode ${width}×${height} ${info.label}. Try a lower resolution or MP4.`);

  onProgress({ phase: 'audio', progress: 0.02 });
  const mix = await renderAudioMix(project, assets, duration);
  throwIfAborted(signal);
  let audioCodec: AudioCodec | null = null;
  if (mix) {
    audioCodec = await getFirstEncodableAudioCodec(container.audio, { numberOfChannels: 2, sampleRate: EXPORT_SAMPLE_RATE, quality });
    // Never ship a silently mute video: fail loudly so the user can pick another container.
    if (!audioCodec) throw new Error(`Your browser can't encode audio for ${info.label}. Try MP4 instead.`);
  }

  const renderer = await TimelineRenderer.create(project, assets, { width, height, fps, endFrame: totalFrames });
  const output = new Output({ format: container.create(), target: new BufferTarget() });
  try {
    output.setMetadataTags({ title: project.name });
    const videoSource = new CanvasSource(renderer.canvas, { codec: videoCodec, quality, keyFrameInterval: 2 });
    output.addVideoTrack(videoSource, { frameRate: fps });
    const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality }) : null;
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();

    let audioWritten = 0;
    for (let f = 0; f < totalFrames; f += 1) {
      throwIfAborted(signal);
      const time = f / fps;

      // Keep audio ~1 s ahead of video so the muxer can interleave.
      while (audioSource && mix && audioWritten < Math.min(duration, time + 1)) {
        const next = Math.min(duration, audioWritten + 1);
        await audioSource.add(sliceAudio(mix, audioWritten, next));
        audioWritten = next;
      }

      await renderer.render(f);
      await videoSource.add(time, 1 / fps);
      if (f % 3 === 0) onProgress({ phase: 'video', progress: 0.05 + 0.9 * (f / totalFrames) });
    }

    onProgress({ phase: 'finalizing', progress: 0.97 });
    await output.finalize();
  } catch (error) {
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel();
    throw error;
  } finally {
    await renderer.dispose();
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error('Export produced no data.');
  onProgress({ phase: 'finalizing', progress: 1 });
  return new Blob([buffer], { type: info.mimeType });
}
