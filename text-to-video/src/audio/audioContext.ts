let shared: AudioContext | null = null;

/** One AudioContext for the whole app (browsers cap how many may exist). */
export function getAudioContext(): AudioContext {
  shared ??= new AudioContext({ latencyHint: 'interactive' });
  return shared;
}
