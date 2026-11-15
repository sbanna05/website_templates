import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  EQ_BANDS,
  EQ_GAIN_RANGE,
  EQ_PRESETS,
  LOW_CUT_RANGE,
  MID_FREQ_RANGE,
  eqResponse,
  formatHz,
  freqToUnit,
  logFrequencies,
  sameEq,
  unitToFreq,
} from '../../engine/eq';
import { clamp } from '../../lib/math';
import type { EqSettings } from '../../types/project';
import { Slider } from '../ui/Slider';

interface EqEditorProps {
  eq: EqSettings;
  /** `key` coalesces a drag into one undo step. */
  onChange: (eq: EqSettings, key?: string) => void;
  label: string;
}

type Band = 'lowCut' | 'low' | 'mid' | 'high';

const W = 300;
const H = 120;
const DB_VIEW = 15;
const FREQS = logFrequencies(160);
const GRID_DB = [-12, -6, 0, 6, 12];
const GRID_HZ = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

const xOf = (hz: number) => freqToUnit(hz) * W;
const yOf = (db: number) => H / 2 - (db / DB_VIEW) * (H / 2);
const dbOf = (y: number) => clamp(Number((((H / 2 - y) / (H / 2)) * DB_VIEW).toFixed(1)), EQ_GAIN_RANGE.min, EQ_GAIN_RANGE.max);
const db = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;

/**
 * Channel-strip EQ: a live response curve with draggable band handles (like a
 * DAW's EQ), backed by sliders for precise values. Handles are keyboard
 * operable: ↑/↓ change gain, ←/→ move the mid frequency or the low cut.
 */
export function EqEditor({ eq, onChange, label }: EqEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ band: Band; gesture: string } | null>(null);

  const curve = useMemo(() => {
    const response = eqResponse(eq, FREQS);
    const points = FREQS.map((f, i) => `${xOf(f).toFixed(1)},${yOf(clamp(response[i], -DB_VIEW, DB_VIEW)).toFixed(1)}`);
    return { line: points.join(' '), area: `0,${H / 2} ${points.join(' ')} ${W},${H / 2}` };
  }, [eq]);

  const handles: { band: Band; x: number; y: number; name: string; value: string }[] = [
    { band: 'lowCut', x: xOf(eq.lowCut > 0 ? eq.lowCut : LOW_CUT_RANGE.min), y: yOf(0), name: 'Low cut', value: eq.lowCut > 0 ? formatHz(eq.lowCut) : 'Off' },
    { band: 'low', x: xOf(EQ_BANDS.lowShelfHz), y: yOf(eq.low), name: 'Bass', value: db(eq.low) },
    { band: 'mid', x: xOf(eq.midFreq), y: yOf(eq.mid), name: 'Mid', value: `${db(eq.mid)} at ${formatHz(eq.midFreq)}` },
    { band: 'high', x: xOf(EQ_BANDS.highShelfHz), y: yOf(eq.high), name: 'Treble', value: db(eq.high) },
  ];

  const apply = (band: Band, x: number, y: number, key?: string) => {
    const hz = unitToFreq(clamp(x / W, 0, 1));
    if (band === 'lowCut') {
      // Dragging into the far left switches the cut off.
      const cut = hz < LOW_CUT_RANGE.min * 1.08 ? 0 : Math.round(clamp(hz, LOW_CUT_RANGE.min, LOW_CUT_RANGE.max));
      onChange({ ...eq, lowCut: cut }, key);
    } else if (band === 'mid') {
      onChange({ ...eq, mid: dbOf(y), midFreq: Math.round(clamp(hz, MID_FREQ_RANGE.min, MID_FREQ_RANGE.max)) }, key);
    } else {
      onChange({ ...eq, [band]: dbOf(y) }, key);
    }
  };

  const toLocal = (event: PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
  };

  const onPointerDown = (band: Band) => (event: PointerEvent<SVGElement>) => {
    event.preventDefault();
    svgRef.current?.setPointerCapture(event.pointerId);
    drag.current = { band, gesture: `eq-${band}-${performance.now()}` };
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const { x, y } = toLocal(event);
    apply(drag.current.band, x, y, drag.current.gesture);
  };

  const onKeyDown = (band: Band) => (event: KeyboardEvent<SVGElement>) => {
    const fine = event.shiftKey ? 0.1 : 0.5;
    const next = { ...eq };
    if (band !== 'lowCut' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const delta = event.key === 'ArrowUp' ? fine : -fine;
      next[band] = clamp(Number((eq[band] + delta).toFixed(1)), EQ_GAIN_RANGE.min, EQ_GAIN_RANGE.max);
    } else if (band === 'mid' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const factor = event.key === 'ArrowRight' ? 1.06 : 1 / 1.06;
      next.midFreq = Math.round(clamp(eq.midFreq * factor, MID_FREQ_RANGE.min, MID_FREQ_RANGE.max));
    } else if (band === 'lowCut' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const base = eq.lowCut || LOW_CUT_RANGE.min;
      const value = Math.round(base * (event.key === 'ArrowRight' ? 1.1 : 1 / 1.1));
      next.lowCut = value < LOW_CUT_RANGE.min ? 0 : Math.min(value, LOW_CUT_RANGE.max);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (band === 'lowCut') next.lowCut = 0;
      else next[band] = 0;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    onChange(next, `eq-key-${band}`);
  };

  return (
    <div className="eq">
      <div className="chip-row" role="group" aria-label={`${label} presets`}>
        {EQ_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.hint}
            className={`chip ${sameEq(eq, preset.eq) ? 'is-active' : ''}`}
            onClick={() => onChange({ ...preset.eq })}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="eq__graph"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        aria-label={`${label} curve`}
        role="group"
      >
        {GRID_HZ.map((hz) => (
          <line key={hz} className="eq__grid" x1={xOf(hz)} x2={xOf(hz)} y1={0} y2={H} />
        ))}
        {GRID_DB.map((d) => (
          <line key={d} className={`eq__grid ${d === 0 ? 'is-zero' : ''}`} x1={0} x2={W} y1={yOf(d)} y2={yOf(d)} />
        ))}
        <polygon className="eq__area" points={curve.area} />
        <polyline className="eq__line" points={curve.line} vectorEffect="non-scaling-stroke" />
        {handles.map((h) => (
          <g
            key={h.band}
            className={`eq__handle eq__handle--${h.band} ${h.band === 'lowCut' && eq.lowCut <= 0 ? 'is-off' : ''}`}
            transform={`translate(${h.x} ${h.y})`}
            tabIndex={0}
            role="slider"
            aria-label={`${label} ${h.name}`}
            aria-valuetext={h.value}
            aria-valuenow={h.band === 'lowCut' ? eq.lowCut : h.band === 'mid' ? eq.mid : eq[h.band]}
            onPointerDown={onPointerDown(h.band)}
            onKeyDown={onKeyDown(h.band)}
          >
            <title>{`${h.name}: ${h.value}`}</title>
            <circle className="eq__hit" r={11} />
            <circle className="eq__dot" r={5} />
          </g>
        ))}
      </svg>
      <div className="eq__axis" aria-hidden="true">
        <span>20</span>
        <span>100</span>
        <span>1k</span>
        <span>10k</span>
      </div>

      <div className="field-row">
        <Slider label="Bass" value={eq.low} min={EQ_GAIN_RANGE.min} max={EQ_GAIN_RANGE.max} step={0.5} defaultValue={0} format={db} onChange={(low) => onChange({ ...eq, low }, 'eq-low')} />
        <Slider label="Treble" value={eq.high} min={EQ_GAIN_RANGE.min} max={EQ_GAIN_RANGE.max} step={0.5} defaultValue={0} format={db} onChange={(high) => onChange({ ...eq, high }, 'eq-high')} />
      </div>
      <div className="field-row">
        <Slider label="Mid" value={eq.mid} min={EQ_GAIN_RANGE.min} max={EQ_GAIN_RANGE.max} step={0.5} defaultValue={0} format={db} onChange={(mid) => onChange({ ...eq, mid }, 'eq-mid')} />
        <Slider
          label="Mid freq"
          value={Math.log(eq.midFreq)}
          min={Math.log(MID_FREQ_RANGE.min)}
          max={Math.log(MID_FREQ_RANGE.max)}
          step={0.01}
          defaultValue={Math.log(1000)}
          format={(v) => formatHz(Math.exp(v))}
          onChange={(v) => onChange({ ...eq, midFreq: Math.round(Math.exp(v)) }, 'eq-midFreq')}
        />
      </div>
      <Slider
        label="Low cut"
        value={eq.lowCut}
        min={0}
        max={LOW_CUT_RANGE.max}
        step={5}
        defaultValue={0}
        format={(v) => (v < LOW_CUT_RANGE.min ? 'Off' : formatHz(v))}
        onChange={(v) => onChange({ ...eq, lowCut: v < LOW_CUT_RANGE.min ? 0 : v }, 'eq-lowCut')}
      />
    </div>
  );
}
