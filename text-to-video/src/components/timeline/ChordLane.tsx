import { memo, useMemo, type CSSProperties } from 'react';
import { chordColor } from '../../config/trackColors';
import { camelotCode, clipKey, keyName, timelineChords } from '../../engine/musicTheory';
import { useHarmonyClip } from '../../hooks/useHarmonyClip';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { useUi } from '../../store/uiStore';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

const CHORD_LANE_HEIGHT = 34;

interface ChordLaneProps {
  headerWidth: number;
  width: number;
  pxPerSecond: number;
  bars: readonly number[];
}

/**
 * "Bars & chords" row, as in a DJ / producer app: bar numbers on top, the chord
 * progression of the followed song below (click a chord to jump there).
 */
export function ChordLane({ headerWidth, width, pxPerSecond, bars }: ChordLaneProps) {
  const clip = useHarmonyClip();
  const asset = useEditor((s) => (clip ? s.assets[clip.assetId] : undefined));
  const key = clip ? clipKey(clip, asset) : null;
  const chords = useMemo(() => (clip ? timelineChords(clip, asset) : []), [clip, asset]);
  const analysing = useEditor((s) => Object.values(s.assets).some((a) => a.kind === 'audio' && a.status === 'ready' && !a.stemOf && !a.harmony));

  return (
    <div className="chord-lane" style={{ height: CHORD_LANE_HEIGHT }}>
      <div className="chord-lane__header" style={{ width: headerWidth }}>
        <Icon name="chord" size={13} />
        {key ? (
          <span className="chord-lane__key" title={`${keyName(key)} · Camelot ${camelotCode(key)}${asset?.name ? ` — ${asset.name}` : ''}`}>
            <strong>{keyName(key)}</strong>
            <span className="camelot">{camelotCode(key)}</span>
          </span>
        ) : (
          <span className="chord-lane__empty">{analysing ? 'Reading chords…' : 'Bars & chords'}</span>
        )}
        <IconButton icon="close" label="Hide the chord row" size={12} className="chord-lane__close" onClick={useUi.getState().toggleChords} />
      </div>
      <div className="chord-lane__track" style={{ width }}>
        <BarNumbers bars={bars} pxPerSecond={pxPerSecond} />
        {chords.map(({ start, end, name, chord }, i) => {
          const w = (end - start) * pxPerSecond;
          return (
            <button
              key={`${start}-${i}`}
              type="button"
              className={`chord-chip ${chord.root < 0 ? 'is-none' : ''}`}
              style={{ left: start * pxPerSecond, width: Math.max(2, w - 1), '--chord': chordColor(chord.root) } as CSSProperties}
              title={`${name} — click to jump here`}
              onClick={() => usePlayback.getState().seek(start)}
            >
              {w > 22 && <span>{name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const BarNumbers = memo(function BarNumbers({ bars, pxPerSecond }: { bars: readonly number[]; pxPerSecond: number }) {
  // Thin out the numbers when zoomed out so they never overlap.
  const gap = bars.length > 1 ? (bars[1] - bars[0]) * pxPerSecond : 999;
  const every = gap >= 28 ? 1 : gap >= 14 ? 2 : gap >= 7 ? 4 : 8;
  return (
    <>
      {bars.map((t, i) =>
        i % every === 0 ? (
          <span key={i} className="bar-number" style={{ left: t * pxPerSecond }}>
            {i + 1}
          </span>
        ) : null,
      )}
    </>
  );
});
