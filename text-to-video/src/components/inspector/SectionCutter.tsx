import { useRef, useState, type PointerEvent } from 'react';
import { cleanWords } from '../../engine/captions';
import { mainBeatClip, snapToGrid, sourceBars } from '../../engine/sections';
import { clamp } from '../../lib/math';
import { formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { AudioClip } from '../../types/project';
import { Waveform } from '../timeline/Waveform';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';

type Snap = 'bar' | 'beat' | 'off';
type Grab = 'from' | 'to' | 'move' | 'new';

const SNAP_OPTIONS: { label: string; value: Snap }[] = [
  { label: 'Bars', value: 'bar' },
  { label: 'Beats', value: 'beat' },
  { label: 'Free', value: 'off' },
];
const EDGE_PX = 8;
const MIN_PART = 0.25;

/**
 * Pick a part of a song (e.g. the chorus vocals) on its full waveform, snapped
 * to bars, and drop it onto the main beat — re-timed and starting on a bar.
 */
export function SectionCutter({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const { addSection, trimToSection } = useEditor.getState();
  const stripRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<{ mode: Grab; anchor: number; from: number; to: number } | null>(null);

  const clipFrom = clip.inPoint;
  const clipTo = clip.inPoint + clip.duration * clip.speed;
  const [range, setRange] = useState({ from: clipFrom, to: clipTo });
  const [snap, setSnap] = useState<Snap>('bar');
  const [matchTempo, setMatchTempo] = useState(true);

  if (!asset || asset.duration <= 0 || !asset.waveform) return null;
  const duration = asset.duration;
  const bars = sourceBars(asset);
  const grid = snap === 'bar' ? bars : snap === 'beat' ? (asset.beats?.beats ?? []) : [];
  const snapTime = (t: number) => (grid.length ? snapToGrid(t, grid) : t);
  const main = mainBeatClip(project, assets, clip.id);
  const words = cleanWords(asset.lyrics?.words ?? []);
  const partWords = words.filter((w) => w.start >= range.from && w.start < range.to);
  const pos = (t: number) => `${(t / duration) * 100}%`;

  const timeAt = (clientX: number) => {
    const rect = stripRef.current!.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const t = timeAt(event.clientX);
    const px = stripRef.current!.getBoundingClientRect().width / duration;
    const near = (edge: number) => Math.abs(edge - t) * px < EDGE_PX;
    // A selection spanning (almost) the whole song can't move, so dragging inside it starts a new one.
    const movable = range.to - range.from < duration * 0.9;
    const mode: Grab = near(range.from) ? 'from' : near(range.to) ? 'to' : movable && t > range.from && t < range.to ? 'move' : 'new';
    grabRef.current = { mode, anchor: t, ...range };
    if (mode === 'new') setRange({ from: snapTime(t), to: snapTime(t) });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const grab = grabRef.current;
    if (!grab) return;
    const t = timeAt(event.clientX);
    if (grab.mode === 'move') {
      const length = grab.to - grab.from;
      const from = clamp(snapTime(grab.from + t - grab.anchor), 0, duration - length);
      setRange({ from, to: from + length });
    } else if (grab.mode === 'from') {
      setRange((r) => ({ ...r, from: Math.min(snapTime(t), r.to - MIN_PART) }));
    } else if (grab.mode === 'to') {
      setRange((r) => ({ ...r, to: Math.max(snapTime(t), r.from + MIN_PART) }));
    } else {
      const a = snapTime(grab.anchor);
      const b = snapTime(t);
      setRange({ from: Math.min(a, b), to: Math.max(a, b) });
    }
  };

  const onPointerUp = () => {
    grabRef.current = null;
    setRange((r) => (r.to - r.from < MIN_PART ? { from: clipFrom, to: clipTo } : r));
  };

  const barIndex = (t: number) => bars.findIndex((b) => Math.abs(b - t) < 0.02) + 1;
  const fromBar = barIndex(range.from);
  const toBar = barIndex(range.to);
  const barLabel = fromBar > 0 && toBar > 0 ? `Bars ${fromBar}–${toBar - 1} · ` : '';

  return (
    <Section title="Cut a part" icon="scissors">
      <div
        ref={stripRef}
        className="section-cutter"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Part of the song"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(range.from)}
        aria-valuetext={`${formatTimecode(range.from)} to ${formatTimecode(range.to)}`}
        tabIndex={0}
      >
        <Waveform peaks={asset.waveform} />
        {bars.map((b, i) => (
          <span key={b} className={`section-cutter__bar ${i % 4 === 0 ? 'is-phrase' : ''}`} style={{ left: pos(b) }} />
        ))}
        {words.map((w, i) => (
          <span key={`${w.start}-${i}`} className="section-cutter__word" style={{ left: pos(w.start) }} title={w.text} />
        ))}
        <span className="section-cutter__current" style={{ left: pos(clipFrom), width: pos(clipTo - clipFrom) }} title="What this clip plays now" />
        <span className="section-cutter__selection" style={{ left: pos(range.from), width: pos(range.to - range.from) }}>
          <span className="section-cutter__handle section-cutter__handle--from" />
          <span className="section-cutter__handle section-cutter__handle--to" />
        </span>
      </div>
      <div className="section-cutter__meta">
        <span>
          {barLabel}
          {formatTimecode(range.from)} – {formatTimecode(range.to)}
        </span>
        <span>{(range.to - range.from).toFixed(1)} s</span>
      </div>
      {partWords.length > 0 && <p className="section-cutter__lyrics">“{partWords.map((w) => w.text).join(' ')}”</p>}
      <Segmented label="Snap" value={snap} options={SNAP_OPTIONS} onChange={setSnap} />
      {main && (
        <Toggle
          label="Match the main beat’s tempo"
          hint={`Re-times this part to ${Math.round((assets[main.assetId]?.beats?.bpm ?? 0) * main.speed)} BPM, pitch unchanged`}
          checked={matchTempo}
          onChange={setMatchTempo}
        />
      )}
      <div className="button-row">
        <Button
          variant="primary"
          icon="plus"
          onClick={() => addSection(clip.id, { ...range, at: usePlayback.getState().time, matchTempo })}
          title={main ? 'Adds this part on the next bar of the main beat after the playhead' : 'Adds this part at the playhead'}
        >
          {main ? 'Place on main beat' : 'Add at playhead'}
        </Button>
        <Button icon="crop" onClick={() => trimToSection(clip.id, range.from, range.to)}>
          Trim to part
        </Button>
      </div>
      <p className="panel-note">
        Drag across the waveform to pick a part; drag its edges to adjust. Ticks are bars (taller every 4 bars)
        {words.length ? ', dots are detected words' : ''}. The new part lands on the next bar after the playhead.
      </p>
    </Section>
  );
}
