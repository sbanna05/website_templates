import { memo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createMotion } from '../../config/defaults';
import { MOTION_CURVE_OPTIONS, MOTION_OPTIONS, type MotionOption } from '../../config/options';
import { sampleCurve } from '../../engine/motion';
import { createId } from '../../lib/id';
import { clamp } from '../../lib/math';
import { useUi } from '../../store/uiStore';
import type { MotionCurve, MotionKind, MotionLayer, VisualClip } from '../../types/project';
import { Button, IconButton } from '../ui/Button';
import { Section } from '../ui/Section';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

const GROUPS: MotionOption['group'][] = ['Zoom', 'Pan', 'Turn', 'Organic'];
const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (v: number) => `${v.toFixed(2)}s`;

const KIND_OPTIONS: { label: string; value: MotionKind }[] = [
  ...MOTION_OPTIONS.filter((o) => o.value !== 'none').map((o) => ({ label: o.label, value: o.value as MotionKind })),
  { label: 'Drawn path', value: 'path' },
];

const motionLabel = (type: MotionKind) => KIND_OPTIONS.find((o) => o.value === type)?.label ?? type;
const glyphOf = (type: MotionKind) => (type === 'path' ? '✎' : (MOTION_OPTIONS.find((o) => o.value === type)?.glyph ?? '·'));

/** What "amount" means for each kind of move, so the slider label says it plainly. */
function amountLabel(type: MotionKind): string {
  if (type === 'path') return 'Path size';
  if (type.startsWith('zoom')) return 'Zoom (of the picture)';
  if (type.startsWith('pan') || type.startsWith('turn') || type === 'drift') return 'Distance (of the picture)';
  if (type === 'spiral') return 'Turn (100% = full circle)';
  return 'Strength';
}

/** Tiny position-over-time graph, so "ease in" vs "hang" is visible at a glance. */
const CurveGlyph = memo(function CurveGlyph({ curve }: { curve: MotionCurve }) {
  const d =
    curve === 'on-beat'
      ? 'M2 30 H10 V22 H18 V14 H26 V6 H34'
      : sampleCurve(curve)
          .map((y, i, all) => `${i === 0 ? 'M' : 'L'}${(2 + (i / (all.length - 1)) * 32).toFixed(1)} ${(30 - y * 24).toFixed(1)}`)
          .join(' ');
  return (
    <svg viewBox="0 0 36 32" className="curve-glyph" aria-hidden="true">
      <path d="M2 30 H34" className="curve-glyph__axis" />
      <path d={d} className="curve-glyph__line" />
    </svg>
  );
});

type Patch = (patch: Partial<VisualClip> | ((clip: VisualClip) => Partial<VisualClip>), key?: string) => void;

interface StripProps {
  clip: VisualClip;
  openId: string | null;
  onOpen: (id: string) => void;
  onTiming: (id: string, from: number, to: number, key: string) => void;
}

/** Mini timeline of the stack: drag a bar to move a move, drag its ends to change when it starts and stops. */
function TimingStrip({ clip, openId, onOpen, onTiming }: StripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const begin = (event: ReactPointerEvent, layer: MotionLayer, mode: 'move' | 'from' | 'to') => {
    event.stopPropagation();
    event.preventDefault();
    onOpen(layer.id);
    const width = ref.current?.getBoundingClientRect().width ?? 1;
    const startX = event.clientX;
    const { from, to } = layer;
    const key = `motion.${layer.id}.timing.${event.timeStamp}`;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const d = (e.clientX - startX) / width;
      if (mode === 'move') {
        const shift = clamp(d, -from, 1 - to);
        onTiming(layer.id, from + shift, to + shift, key);
      } else if (mode === 'from') onTiming(layer.id, clamp(from + d, 0, to - 0.02), to, key);
      else onTiming(layer.id, from, clamp(to + d, from + 0.02, 1), key);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  return (
    <div className="motion-strip" ref={ref} aria-label="When each move plays inside the clip">
      <div className="motion-strip__ruler" aria-hidden="true">
        <span>0s</span>
        <span>{secs(clip.duration / 2)}</span>
        <span>{secs(clip.duration)}</span>
      </div>
      {clip.motions.map((layer) => (
        <div className="motion-strip__lane" key={layer.id}>
          <div
            className={`motion-strip__bar ${openId === layer.id ? 'is-active' : ''}`}
            style={{ left: `${layer.from * 100}%`, width: `${(layer.to - layer.from) * 100}%` }}
            onPointerDown={(e) => begin(e, layer, 'move')}
            title={`${motionLabel(layer.type)} · ${secs(layer.from * clip.duration)}–${secs(layer.to * clip.duration)}`}
          >
            <span className="motion-strip__edge motion-strip__edge--from" onPointerDown={(e) => begin(e, layer, 'from')} />
            <span className="motion-strip__label">
              {glyphOf(layer.type)} {motionLabel(layer.type)}
            </span>
            <span className="motion-strip__edge motion-strip__edge--to" onPointerDown={(e) => begin(e, layer, 'to')} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface MotionSectionProps {
  clip: VisualClip;
  patch: Patch;
}

/** Motion stack: any number of moves, each with its own window, amount, pace and repeats. */
export function MotionSection({ clip, patch }: MotionSectionProps) {
  const [openId, setOpenId] = useState<string | null>(clip.motions.at(-1)?.id ?? null);
  const pathEdit = useUi((s) => s.pathEdit);
  const setPathEdit = useUi((s) => s.setPathEdit);
  const D = Math.max(clip.duration, 0.01);

  const update = (id: string, next: Partial<MotionLayer>, key?: string) =>
    patch((c) => ({ motions: c.motions.map((m) => (m.id === id ? { ...m, ...next } : m)) }), key);
  const add = (type: MotionKind) => {
    const layer = createMotion(type);
    patch((c) => ({ motions: [...c.motions, layer] }));
    setOpenId(layer.id);
    if (type === 'path') setPathEdit({ clipId: clip.id, motionId: layer.id });
  };
  const remove = (id: string) => {
    if (pathEdit?.motionId === id) setPathEdit(null);
    patch((c) => ({ motions: c.motions.filter((m) => m.id !== id) }));
  };
  const duplicate = (layer: MotionLayer) => {
    const copy: MotionLayer = { ...layer, id: createId('mot'), path: layer.path ? [...layer.path] : undefined };
    patch((c) => ({ motions: [...c.motions, copy] }));
    setOpenId(copy.id);
  };

  return (
    <Section title={`Motion${clip.motions.length ? ` · ${clip.motions.length}` : ''}`} icon="sparkle">
      {clip.motions.length > 0 ? (
        <TimingStrip
          clip={clip}
          openId={openId}
          onOpen={setOpenId}
          onTiming={(id, from, to, key) => update(id, { from, to }, key)}
        />
      ) : (
        <p className="panel-note">Still picture. Add one or more moves below — they stack, so a zoom and a pan can run together or one after the other.</p>
      )}

      {clip.motions.map((layer, i) => {
        const open = openId === layer.id;
        const drawing = pathEdit?.clipId === clip.id && pathEdit.motionId === layer.id;
        return (
          <div className={`light-card motion-card ${open ? 'is-open' : ''}`} key={layer.id}>
            <div className="light-card__header">
              <button type="button" className="light-card__title" aria-expanded={open} onClick={() => setOpenId(open ? null : layer.id)}>
                <span className="motion-card__glyph" aria-hidden="true">
                  {glyphOf(layer.type)}
                </span>
                {i + 1}. {motionLabel(layer.type)}
                <span className="motion-card__time">
                  {secs(layer.from * D)}–{secs(layer.to * D)}
                  {layer.repeat > 1 ? ` ×${layer.repeat}` : ''}
                </span>
              </button>
              <IconButton icon="copy" label={`Duplicate ${motionLabel(layer.type)}`} size={14} onClick={() => duplicate(layer)} />
              <IconButton icon="trash" label={`Remove ${motionLabel(layer.type)}`} size={14} onClick={() => remove(layer.id)} />
            </div>
            {open && (
              <div className="light-card__body">
                <Select
                  label="Move"
                  value={layer.type}
                  options={KIND_OPTIONS}
                  onChange={(type) => update(layer.id, { type, ...(type === 'path' && !layer.path ? { path: [] } : {}) })}
                />

                {layer.type === 'path' && (
                  <div className="path-tools">
                    <Button
                      size="sm"
                      variant={drawing ? 'primary' : 'secondary'}
                      icon="curve"
                      onClick={() => setPathEdit(drawing ? null : { clipId: clip.id, motionId: layer.id })}
                    >
                      {drawing ? 'Done drawing' : layer.path?.length ? 'Edit path' : 'Draw path'}
                    </Button>
                    {Boolean(layer.path?.length) && (
                      <Button size="sm" variant="ghost" onClick={() => update(layer.id, { path: [] })}>
                        Clear
                      </Button>
                    )}
                    <p className="panel-note">
                      {drawing
                        ? 'Drag on the preview to draw. The picture starts where it rests and follows your line. Drag a dot to adjust it, double-click a dot to delete it.'
                        : `${layer.path?.length ?? 0} points. Open the path to draw or reshape it on the preview.`}
                    </p>
                  </div>
                )}

                <Slider
                  label={amountLabel(layer.type)}
                  value={layer.amount}
                  min={layer.type === 'path' ? 0.1 : 0.01}
                  max={layer.type === 'path' ? 2 : 1}
                  step={0.01}
                  defaultValue={createMotion(layer.type).amount}
                  format={pct}
                  onChange={(amount) => update(layer.id, { amount }, `motion.${layer.id}.amount`)}
                />

                <div className="field-row">
                  <Slider
                    label="Starts at"
                    value={layer.from * D}
                    min={0}
                    max={D}
                    step={0.01}
                    defaultValue={0}
                    format={secs}
                    onChange={(v) => update(layer.id, { from: clamp(v / D, 0, layer.to - 0.01) }, `motion.${layer.id}.from`)}
                  />
                  <Slider
                    label="Ends at"
                    value={layer.to * D}
                    min={0}
                    max={D}
                    step={0.01}
                    defaultValue={D}
                    format={secs}
                    onChange={(v) => update(layer.id, { to: clamp(v / D, layer.from + 0.01, 1) }, `motion.${layer.id}.to`)}
                  />
                </div>
                <div className="field-row">
                  <Slider
                    label="Repeat"
                    value={layer.repeat}
                    min={1}
                    max={12}
                    step={1}
                    defaultValue={1}
                    format={(v) => (v === 1 ? 'Once' : `${v}×`)}
                    onChange={(repeat) => update(layer.id, { repeat }, `motion.${layer.id}.repeat`)}
                  />
                  <div className="field motion-card__speed">
                    <span className="field__label">Speed</span>
                    <span className="field__value">{secs(((layer.to - layer.from) * D) / Math.max(1, layer.repeat))} per pass</span>
                  </div>
                </div>
                {layer.repeat > 1 && (
                  <Toggle label="Back and forth" hint="Each repeat plays in reverse instead of jumping back" checked={layer.yoyo} onChange={(yoyo) => update(layer.id, { yoyo })} />
                )}

                <div className="field">
                  <span className="field__label">
                    <span>Pace</span>
                    <span className="field__value">{MOTION_CURVE_OPTIONS.find((o) => o.value === layer.curve)?.hint}</span>
                  </span>
                  <div className="curve-grid" role="radiogroup" aria-label="Motion pace">
                    {MOTION_CURVE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={layer.curve === option.value}
                        title={option.hint}
                        className={`curve-tile ${layer.curve === option.value ? 'is-active' : ''}`}
                        onClick={() => update(layer.id, { curve: option.value })}
                      >
                        <CurveGlyph curve={option.value} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="field">
        <span className="field__label">Add a move</span>
        <div className="motion-grid" role="group" aria-label="Add a move">
          <button type="button" className="motion-tile motion-tile--path" onClick={() => add('path')}>
            <span className="motion-tile__glyph" aria-hidden="true">
              ✎
            </span>
            <span>Draw path</span>
          </button>
          {GROUPS.flatMap((group) =>
            MOTION_OPTIONS.filter((o) => o.group === group && o.value !== 'none').map((option) => (
              <button key={option.value} type="button" className="motion-tile" title={`${group}: add ${option.label}`} onClick={() => add(option.value)}>
                <span className="motion-tile__glyph" aria-hidden="true">
                  {option.glyph}
                </span>
                <span>{option.label}</span>
              </button>
            )),
          )}
        </div>
      </div>
    </Section>
  );
}
