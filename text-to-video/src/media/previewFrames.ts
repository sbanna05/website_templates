import { isClipActive, sourceTimeAt } from '../engine/timeline';
import type { FrameSource } from '../engine/types';
import type { Project, VisualClip } from '../types/project';
import { mediaRegistry } from './mediaRegistry';

/** Seek before an upcoming clip so cuts are instant. */
const PREROLL_SECONDS = 1.5;
const DRIFT_TOLERANCE = 0.2;

/**
 * Live-preview frame source: one muted <video> per clip, kept in sync with
 * the playhead. Audio is handled separately by Web Audio for sample accuracy.
 */
export class PreviewFrames implements FrameSource {
  private videos = new Map<string, HTMLVideoElement>();
  private readonly onFrame: () => void;

  constructor(onFrame: () => void) {
    this.onFrame = onFrame;
  }

  get(clip: VisualClip): CanvasImageSource | null {
    const handle = mediaRegistry.get(clip.assetId);
    if (!handle) return null;
    if (handle.kind === 'image') return handle.image ?? null;
    const video = this.videos.get(clip.id);
    return video && video.readyState >= 2 ? video : null;
  }

  sync(project: Project, time: number, playing: boolean): void {
    const hidden = new Set(project.tracks.filter((t) => t.hidden).map((t) => t.id));
    const seen = new Set<string>();

    for (const clip of project.clips) {
      if (clip.kind !== 'visual' || hidden.has(clip.trackId)) continue;
      const handle = mediaRegistry.get(clip.assetId);
      if (handle?.kind !== 'video') continue;
      seen.add(clip.id);
      const video = this.ensureVideo(clip.id, handle.url);
      const active = isClipActive(clip, time);
      const upcoming = !active && clip.start > time && clip.start - time < PREROLL_SECONDS;
      const end = Number.isFinite(video.duration) ? video.duration - 0.05 : Number.POSITIVE_INFINITY;
      const target = Math.min(end, active ? sourceTimeAt(clip, time) : clip.inPoint);

      if (active && playing) {
        if (video.playbackRate !== clip.speed) video.playbackRate = clip.speed;
        if (video.paused) {
          video.currentTime = target;
          void video.play().catch(() => undefined);
        } else if (Math.abs(video.currentTime - target) > DRIFT_TOLERANCE) {
          video.currentTime = target;
        }
      } else {
        if (!video.paused) video.pause();
        if ((active || upcoming) && !video.seeking && Math.abs(video.currentTime - target) > 1 / 60) {
          video.currentTime = target;
        }
      }
    }

    for (const [clipId, video] of this.videos) {
      if (!seen.has(clipId)) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        this.videos.delete(clipId);
      }
    }
  }

  dispose(): void {
    for (const video of this.videos.values()) {
      video.pause();
      video.removeAttribute('src');
    }
    this.videos.clear();
  }

  private ensureVideo(clipId: string, url: string): HTMLVideoElement {
    let video = this.videos.get(clipId);
    if (!video) {
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.preservesPitch = true;
      video.addEventListener('seeked', this.onFrame);
      video.addEventListener('loadeddata', this.onFrame);
      video.src = url;
      this.videos.set(clipId, video);
    }
    return video;
  }
}
