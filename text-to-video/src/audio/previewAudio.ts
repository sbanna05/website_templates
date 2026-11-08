import type { Asset, Project } from '../types/project';
import { getAudioContext } from './audioContext';
import { collectMixSources, ensureMixBuffers, scheduleMix } from './mixer';

const START_LATENCY = 0.06;

/** Realtime playback of the timeline's audio. Its clock is the master clock for the preview. */
export class PreviewAudio {
  private nodes: AudioBufferSourceNode[] = [];
  private master: GainNode | null = null;
  private ctxStart = 0;
  private timelineStart = 0;
  private running = false;
  /** Bumped on every start/stop so stale async starts can bail out. */
  private session = 0;

  async start(project: Project, assets: Record<string, Asset>, from: number): Promise<boolean> {
    const session = ++this.session;
    const ctx = getAudioContext();
    const sources = collectMixSources(project, assets);
    await Promise.all([ctx.resume(), ensureMixBuffers(sources)]);
    if (session !== this.session) return false;

    this.stopNodes();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
    }
    this.ctxStart = ctx.currentTime + START_LATENCY;
    this.timelineStart = from;
    this.nodes = scheduleMix(ctx, this.master, sources, from, this.ctxStart);
    this.running = true;
    return true;
  }

  /** Re-schedules from the current position after an edit, once any new processing is done. */
  async reschedule(project: Project, assets: Record<string, Asset>): Promise<void> {
    if (!this.running) return;
    const session = this.session;
    await ensureMixBuffers(collectMixSources(project, assets));
    if (this.running && session === this.session) await this.start(project, assets, this.now());
  }

  stop(): void {
    this.session += 1;
    this.timelineStart = this.now();
    this.running = false;
    this.stopNodes();
  }

  now(): number {
    if (!this.running) return this.timelineStart;
    return this.timelineStart + Math.max(0, getAudioContext().currentTime - this.ctxStart);
  }

  private stopNodes(): void {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      node.disconnect();
    }
    this.nodes = [];
  }
}
