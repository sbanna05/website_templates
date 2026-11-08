import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { VOLUME_KEY_RANGE, buildUpKeys, createKey, dipKeys, pumpKeys, sortKeys, volumeAt, type KeyPresetRange } from '../../engine/automation';
import { clamp } from '../../lib/math';
import { useEditor } from '../../store/editorStore';
import type { AudioClip, CurveShape, VolumeKey } from '../../types/project';
import { Waveform } from '../timeline/Waveform';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { useClipPatch } from './useClipPatch';

const HEIGHT = 128;
const PAD = 8;
const SNAP_PX = 10;
const ZOOMS = [
  { label: 'Fit', value: 1 },
  { label: '4×', value: 4 },
  { label: '12×', value: 12 },
] as const;
const SHAPES: { label: string; value: CurveShape; title: string }[] = [
  { label: 'Smooth', value: 'smooth', title: 'Eases in and out — no corners' },
  { label: 'Linear', value: 'linear', title: 'Straight ramp to the next point' },
  { label: 'Hold', value: 'hold', title: 'Stays flat, then jumps at the next point' },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Graph width in viewBox units (the SVG stretches to fit). */
const W = 1000;
const y = (v: number) => PAD + (1 - v / VOLUME_KEY_RANGE.max) * (HEIGHT - PAD * 2);

/**
 * Graph editor for a song's volume: click to drop a point (it snaps to beats),
 * drag to move it, double-click (or Delete) to remove it. Points are joined by
 * smooth / linear / hold curves, like keyframes in Blender.
 */
export function VolumeCurveEditor({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const patch = useClipPatch(clip);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; gesture: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [snapToBeats, setSnap] = useState(true);

  const from = clip.inPoint;
  const to = clip.inPoint + clip.duration * clip.speed;
  const keys = useMemo(() => sortKeys(clip.volumeKeys), [clip.volumeKeys]);
  const beats = useMemo(() => (asset?.beats?.beats ?? []).filter((b) => b >= from && b <= to), [asset, from, to]);
  const selected = keys.find((k) => k.id === selectedId);
  const range: KeyPresetRange = { from, to, beats };

  const x = (t: number) => ((t - from) / Math.max(1e-6, to - from)) * W;

  const curve = useMemo(() => {
    const steps = 400 * zoom;
    const points: string[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = from + ((to - from) * i) / steps;
      points.push(`${((i / steps) * W).toFixed(1)},${y(volumeAt(keys, t)).toFixed(1)}`);
    }
    return points.join(' ');
  }, [keys, from, to, zoom]);

  const setKeys = (next: VolumeKey[], key?: string) => patch({ volumeKeys: sortKeys(next) }, key);

  const pointerToKey = (event: PointerEvent): { time: number; value: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    const rawTime = from + clamp((event.clientX - rect.left) / rect.width, 0, 1) * (to - from);
    const value = clamp((1 - (event.clientY - rect.top - PAD) / (rect.height - PAD * 2)) * VOLUME_KEY_RANGE.max, 0, VOLUME_KEY_RANGE.max);
    let time = rawTime;
    if (snapToBeats && beats.length) {
      const nearest = beats.reduce((a, b) => (Math.abs(b - rawTime) < Math.abs(a - rawTime) ? b : a));
      if ((Math.abs(nearest - rawTime) / (to - from)) * rect.width < SNAP_PX) time = nearest;
    }
    // Values snap to 100 % so "back to normal" is easy to hit.
    return { time, value: Math.abs(value - 1) < 0.04 ? 1 : value };
  };

  const startDrag = (event: PointerEvent, id: string) => {
    svgRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = { id, gesture: `curve-${id}-${event.timeStamp}` };
    setSelectedId(id);
  };

  const onBackgroundDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    const { time, value } = pointerToKey(event);
    const key = createKey(time, value, selected?.shape ?? 'smooth');
    setKeys([...keys, key]);
    startDrag(event, key.id);
  };

  // Pointer capture moves to the SVG while dragging, so it receives every move — even when starting on a point.
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { time, value } = pointerToKey(event);
    setKeys(
      keys.map((k) => (k.id === drag.id ? { ...k, time, value } : k)),
      drag.gesture,
    );
  };

  const remove = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
    setSelectedId(null);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
      event.preventDefault();
      event.stopPropagation();
      remove(selected.id);
    }
  };

  const updateSelected = (next: Partial<VolumeKey>, key?: string) =>
    selected && setKeys(keys.map((k) => (k.id === selected.id ? { ...k, ...next } : k)), key);

  const peaksPerSecond = asset?.waveform && asset.duration > 0 ? asset.waveform.length / asset.duration : 0;

  return (
    <Section title="Volume curve" icon="curve">
      <div className="chip-row" role="group" aria-label="Curve presets">
        <button type="button" className="chip" disabled={beats.length < 2} onClick={() => setKeys(pumpKeys(range))} title="Duck on every beat and swell back — sidechain pump">
          Pump on beat
        </button>
        <button type="button" className="chip" onClick={() => setKeys(buildUpKeys(range))} title="Quiet to loud across the clip">
          Build up
        </button>
        <button type="button" className="chip" onClick={() => setKeys(dipKeys(range))} title="Quieter in the middle third">
          Dip middle
        </button>
        <button type="button" className="chip" disabled={keys.length === 0} onClick={() => setKeys([])}>
          Flat
        </button>
      </div>

      <div className="curve-editor" onKeyDown={onKeyDown}>
        <div className="curve-editor__canvas" style={{ width: `${zoom * 100}%`, height: HEIGHT }}>
          {asset?.waveform && peaksPerSecond > 0 && (
            <div className="curve-editor__wave">
              <Waveform peaks={asset.waveform} from={from * peaksPerSecond} to={to * peaksPerSecond} />
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="curve-editor__svg"
            onPointerDown={onBackgroundDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
            tabIndex={0}
            role="application"
            aria-label="Volume curve. Click to add a point, drag to move, double-click or Delete to remove."
          >
            {beats.map((b) => (
              <line key={b} className="curve-editor__beat" x1={x(b)} x2={x(b)} y1={0} y2={HEIGHT} />
            ))}
            <line className="curve-editor__unity" x1={0} x2={W} y1={y(1)} y2={y(1)} />
            <polyline className="curve-editor__area" points={`0,${HEIGHT} ${curve} ${W},${HEIGHT}`} />
            <polyline className="curve-editor__line" points={curve} />
          </svg>
          {/* Points are HTML so they stay round however far the SVG is stretched. */}
          {keys.map((k) => (
            <button
              key={k.id}
              type="button"
              className={`curve-editor__key curve-editor__key--${k.shape} ${k.id === selectedId ? 'is-selected' : ''}`}
              style={{ left: `${(x(k.time) / W) * 100}%`, top: y(k.value) }}
              onPointerDown={(e) => {
                e.stopPropagation();
                startDrag(e, k.id);
              }}
              onDoubleClick={() => remove(k.id)}
              aria-label={`Volume point ${pct(k.value)}`}
            />
          ))}
        </div>
      </div>

      <div className="field-row">
        <Segmented label="Zoom" value={zoom} options={ZOOMS} onChange={setZoom} />
      </div>
      <Toggle label="Snap points to beats" checked={snapToBeats} onChange={setSnap} />

      {selected ? (
        <div className="curve-editor__point">
          <Slider label="Point volume" value={selected.value} min={0} max={VOLUME_KEY_RANGE.max} defaultValue={1} format={pct} onChange={(value) => updateSelected({ value }, `key-${selected.id}`)} />
          <Segmented label="Curve to next point" value={selected.shape} options={SHAPES} onChange={(shape) => updateSelected({ shape })} />
          <Button size="sm" variant="ghost" icon="trash" onClick={() => remove(selected.id)}>
            Delete point
          </Button>
        </div>
      ) : (
        <p className="panel-note">
          Click the graph to add a point, drag it to shape the volume. Points stick to the music, so they stay on their
          beat when you trim or re-time the clip. {keys.length > 0 && `${keys.length} points.`}
        </p>
      )}
    </Section>
  );
}
