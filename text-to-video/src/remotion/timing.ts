export const MIN_FRAMES_PER_WORD = 6;
export const MAX_FRAMES_PER_WORD = 24;

/** Converts the 1–10 "speed" slider into how many frames each word stays the active one. */
export function framesPerWordFromSpeed(speed: number): number {
  const t = (speed - 1) / 9;
  return Math.round(MAX_FRAMES_PER_WORD - t * (MAX_FRAMES_PER_WORD - MIN_FRAMES_PER_WORD));
}
