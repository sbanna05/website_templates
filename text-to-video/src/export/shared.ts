import { connectMaster } from '../audio/master';
import { collectMixSources, ensureMixBuffers, scheduleMix } from '../audio/mixer';
import { cssFont } from '../config/fonts';
import { renderFrame } from '../engine/renderFrame';
import { timelineBeats } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { ExportFrames } from './exportFrames';
import { EXPORT_SAMPLE_RATE } from './formats';

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
}

/** Lets the browser paint and handle input between heavy synchronous steps. */
export const yieldToMain = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Makes sure every font used by a text clip is ready before the first frame is drawn. */
export async function loadFonts(project: Project): Promise<void> {
  const fonts = new Set(
    project.clips.flatMap((c) => (c.kind === 'text' ? [cssFont(c.style.fontFamily, c.style.fontWeight, 40, c.style.italic)] : [])),
  );
  await Promise.all([...fonts].map((font) => document.fonts.load(font)));
}

/** Renders the full mix through the master bus. Returns null when the project is silent. */
export async function renderAudioMix(project: Project, assets: Record<string, Asset>, duration: number): Promise<AudioBuffer | null> {
  const sources = collectMixSources(project, assets);
  if (sources.length === 0 || duration <= 0) return null;
  await ensureMixBuffers(sources);
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * EXPORT_SAMPLE_RATE), EXPORT_SAMPLE_RATE);
  scheduleMix(ctx, connectMaster(ctx, ctx.destination, project.master), sources, 0, 0);
  return ctx.startRendering();
}

/** Copies the [from, to) window (seconds) of a rendered mix into a new buffer. */
export function sliceAudio(buffer: AudioBuffer, from: number, to: number): AudioBuffer {
  const start = Math.floor(from * buffer.sampleRate);
  const end = Math.min(buffer.length, Math.floor(to * buffer.sampleRate));
  const slice = new AudioBuffer({ length: Math.max(1, end - start), numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    slice.copyToChannel(buffer.getChannelData(c).subarray(start, end), c);
  }
  return slice;
}

/** Feeds a rendered mix to an encoder in one-second chunks to keep memory flat. */
export async function* audioChunks(mix: AudioBuffer, signal: AbortSignal): AsyncGenerator<{ chunk: AudioBuffer; done: number }> {
  for (let from = 0; from < mix.duration; from += 1) {
    throwIfAborted(signal);
    const to = Math.min(mix.duration, from + 1);
    yield { chunk: sliceAudio(mix, from, to), done: to / mix.duration };
  }
}

export interface TimelineRendererOptions {
  width: number;
  height: number;
  fps: number;
  /** Exclusive end frame index. */
  endFrame: number;
  /** First frame that will be rendered (frames must be rendered in order from here). */
  startFrame?: number;
  /** Optimises the canvas for repeated getImageData() reads (GIF). */
  readback?: boolean;
}

/**
 * Draws timeline frames onto an offscreen canvas at export resolution with
 * frame-accurate video decoding. Frames must be requested in ascending order.
 */
export class TimelineRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly project: Project;
  private readonly assets: Record<string, Asset>;
  private readonly frames: ExportFrames;
  private readonly beats: ReturnType<typeof timelineBeats>;
  private readonly fps: number;

  private constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    project: Project,
    assets: Record<string, Asset>,
    frames: ExportFrames,
    fps: number,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.project = project;
    this.assets = assets;
    this.frames = frames;
    this.beats = timelineBeats(project, assets);
    this.fps = fps;
  }

  static async create(project: Project, assets: Record<string, Asset>, options: TimelineRendererOptions): Promise<TimelineRenderer> {
    const { width, height, fps, endFrame, startFrame = 0, readback = false } = options;
    await loadFonts(project);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: readback });
    if (!ctx) throw new Error('Could not create a 2D canvas.');
    const frames = await ExportFrames.create(project, fps, endFrame, startFrame);
    return new TimelineRenderer(canvas, ctx, project, assets, frames, fps);
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  /** Draws frame `index` and returns its timeline time in seconds. */
  async render(index: number): Promise<number> {
    const time = index / this.fps;
    await this.frames.prepare(time);
    renderFrame(this.ctx, { project: this.project, assets: this.assets, time, width: this.width, height: this.height, frames: this.frames, beats: this.beats });
    return time;
  }

  dispose(): Promise<void> {
    return this.frames.dispose();
  }
}
