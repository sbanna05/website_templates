import { usePlayback } from '../../store/playbackStore';

interface PlayheadProps {
  pxPerSecond: number;
  offset?: number;
  /** The knob lives in the sticky ruler; the line runs through the lanes beneath the headers. */
  part: 'line' | 'knob';
}

export function Playhead({ pxPerSecond, offset = 0, part }: PlayheadProps) {
  const time = usePlayback((s) => s.time);
  return (
    <div
      className={part === 'line' ? 'playhead' : 'playhead-knob'}
      style={{ transform: `translateX(${offset + time * pxPerSecond}px)` }}
      aria-hidden="true"
    />
  );
}
