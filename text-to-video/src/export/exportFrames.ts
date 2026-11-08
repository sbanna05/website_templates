import { ALL_FORMATS, BlobSource, CanvasSink, Input, type WrappedCanvas } from 'mediabunny';
import { isClipActive, sourceTimeAt } from '../engine/timeline';
import type { FrameSource } from '../engine/types';
import { mediaRegistry } from '../media/mediaRegistry';
import type { Project, VisualClip } from '../types/project';

interface ClipDecoder {
  clip: VisualClip;
  input: Input;
  frames: AsyncGenerator<WrappedCanvas | null>;
}

/**
 * Frame-accurate decoding for export via WebCodecs (Mediabunny). Each video
 * clip gets one monotonic decode stream with exactly one entry per output
 * frame it's visible in, so every packet is decoded at most once.
 */
export class ExportFrames implements FrameSource {
  private decoders = new Map<string, ClipDecoder>();
  private current = new Map<string, CanvasImageSource>();

  static async create(project: Project, fps: number, totalFrames: number): Promise<ExportFrames> {
    const instance = new ExportFrames();
    const hidden = new Set(project.tracks.filter((t) => t.hidden).map((t) => t.id));
    for (const clip of project.clips) {
      if (clip.kind !== 'visual' || hidden.has(clip.trackId)) continue;
      const handle = mediaRegistry.get(clip.assetId);
      if (handle?.kind !== 'video' || !handle.file) continue;
      const { file } = handle;

      const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
      const track = await input.getPrimaryVideoTrack();
      if (!track || !(await track.canDecode())) {
        input.dispose();
        throw new Error(`Your browser can't decode "${file.name}" for export.`);
      }
      const duration = await track.computeDuration();
      const sink = new CanvasSink(track, { poolSize: 3 });
      const timestamps = function* () {
        for (let f = Math.max(0, Math.floor(clip.start * fps) - 1); f < totalFrames; f += 1) {
          const t = f / fps;
          if (t >= clip.start + clip.duration) return;
          if (isClipActive(clip, t)) yield Math.min(Math.max(0, sourceTimeAt(clip, t)), duration - 1e-3);
        }
      };
      instance.decoders.set(clip.id, { clip, input, frames: sink.canvasesAtTimestamps(timestamps()) });
    }
    return instance;
  }

  /** Advances every decoder that's visible at `time`. Call once per output frame, in order. */
  async prepare(time: number): Promise<void> {
    for (const { clip, frames } of this.decoders.values()) {
      if (!isClipActive(clip, time)) continue;
      const { value } = await frames.next();
      if (value) this.current.set(clip.id, value.canvas);
    }
  }

  get(clip: VisualClip): CanvasImageSource | null {
    const handle = mediaRegistry.get(clip.assetId);
    if (handle?.kind === 'image') return handle.image ?? null;
    return this.current.get(clip.id) ?? null;
  }

  async dispose(): Promise<void> {
    for (const { frames, input } of this.decoders.values()) {
      await frames.return(undefined);
      input.dispose();
    }
    this.decoders.clear();
    this.current.clear();
  }
}
