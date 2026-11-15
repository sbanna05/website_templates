let shared: AudioContext | null = null;

/**
 * One AudioContext for the whole app (browsers cap how many may exist).
 * "balanced" gives the audio thread a bigger buffer than "interactive", so a
 * many-track mix doesn't drop out (crackle) when the CPU is busy; the preview
 * clock subtracts the extra latency, so picture and sound stay in sync.
 */
export function getAudioContext(): AudioContext {
  shared ??= new AudioContext({ latencyHint: 'balanced' });
  return shared;
}

/** Seconds between the audio clock and the sound actually leaving the speakers. */
export function outputLatency(ctx: AudioContext): number {
  const value = ctx.outputLatency || ctx.baseLatency || 0;
  return Number.isFinite(value) ? Math.min(value, 0.5) : 0;
}
