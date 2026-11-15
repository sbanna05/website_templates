import type { Asset, Project } from '../types/project';
import { getAudioContext, outputLatency } from './audioContext';
import { connectMaster } from './master';
import { collectMixSources, ensureMixBuffers, scheduleMix } from './mixer';

/** Output level for meters, linear 0–1 (1 = 0 dBFS). */
export interface Levels {
  peak: [number, number];
  rms: [number, number];
}

const SILENT: Levels = { peak: [0, 0], rms: [0, 0] };

const START_LATENCY = 0.06;

/** Realtime playback of the timeline's audio. Its clock is the master clock for the preview. */
export class PreviewAudio {
  private nodes: AudioBufferSourceNode[] = [];
  private output: GainNode | null = null;
  /** One analyser per channel, tapped after the master bus. */
  private meters: [AnalyserNode, AnalyserNode] | null = null;
  private meterData = new Float32Array(2048);
  /** Per-start bus, so reverb tails stop with playback instead of ringing on after pause. */
  private bus: GainNode | null = null;
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
    const output = this.ensureOutput(ctx);
    this.ctxStart = ctx.currentTime + START_LATENCY;
    this.timelineStart = from;
    this.bus = ctx.createGain();
    this.bus.connect(output);
    this.nodes = scheduleMix(ctx, connectMaster(ctx, this.bus, project.master), sources, from, this.ctxStart);
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

  /** Current output level, read by the master meter while playing. */
  levels(): Levels {
    if (!this.running || !this.meters) return SILENT;
    const read = (analyser: AnalyserNode): [number, number] => {
      analyser.getFloatTimeDomainData(this.meterData);
      let peak = 0;
      let sum = 0;
      for (const v of this.meterData) {
        const a = Math.abs(v);
        if (a > peak) peak = a;
        sum += v * v;
      }
      return [peak, Math.sqrt(sum / this.meterData.length)];
    };
    const [lp, lr] = read(this.meters[0]);
    const [rp, rr] = read(this.meters[1]);
    return { peak: [lp, rp], rms: [lr, rr] };
  }

  now(): number {
    if (!this.running) return this.timelineStart;
    // What is *heard* now: the audio clock minus the time the sound spends in the output buffer.
    const ctx = getAudioContext();
    return this.timelineStart + Math.max(0, ctx.currentTime - outputLatency(ctx) - this.ctxStart);
  }

  /** Final output stage: bus → speakers, with a left/right analyser tap for the meters. */
  private ensureOutput(ctx: AudioContext): GainNode {
    if (this.output) return this.output;
    this.output = ctx.createGain();
    this.output.connect(ctx.destination);
    const splitter = ctx.createChannelSplitter(2);
    this.output.connect(splitter);
    const meters = [ctx.createAnalyser(), ctx.createAnalyser()] as [AnalyserNode, AnalyserNode];
    meters.forEach((meter, channel) => {
      meter.fftSize = this.meterData.length;
      splitter.connect(meter, channel);
    });
    this.meters = meters;
    return this.output;
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
    this.bus?.disconnect();
    this.bus = null;
  }
}
