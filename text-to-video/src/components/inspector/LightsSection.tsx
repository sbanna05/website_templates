import { useState } from 'react';
import { createLight } from '../../config/defaults';
import { LIGHT_OPTIONS } from '../../config/options';
import { ANGLED_LIGHTS } from '../../engine/drawLights';
import type { LightAnimation, LightBlend, LightEffect, LightType, VisualClip } from '../../types/project';
import { IconButton } from '../ui/Button';
import { ColorField } from '../ui/ColorField';
import { Section } from '../ui/Section';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

const pct = (v: number) => `${Math.round(v * 100)}%`;

const BLEND_OPTIONS: { label: string; value: LightBlend }[] = [
  { label: 'Natural', value: 'auto' },
  { label: 'Screen (soft add)', value: 'screen' },
  { label: 'Add (bright)', value: 'add' },
  { label: 'Color dodge (hot)', value: 'color-dodge' },
  { label: 'Overlay (contrast)', value: 'overlay' },
  { label: 'Soft light (subtle)', value: 'soft-light' },
];

const ANIMATION_OPTIONS: { label: string; value: LightAnimation }[] = [
  { label: 'Still', value: 'none' },
  { label: 'Pulse', value: 'pulse' },
  { label: 'Flicker (candle, neon)', value: 'flicker' },
  { label: 'Breathe (grows and shrinks)', value: 'breathe' },
  { label: 'Drift (wanders)', value: 'drift' },
  { label: 'Spin', value: 'spin' },
];

/** Colour pairs that read well on photos — muted, filmic. */
const LIGHT_PALETTES: { name: string; color: string; color2: string }[] = [
  { name: 'Warm', color: '#f6dcae', color2: '#e0a273' },
  { name: 'Moon', color: '#e9eef0', color2: '#8fa9ba' },
  { name: 'Sage', color: '#d9ead8', color2: '#77a68e' },
  { name: 'Dusk', color: '#f0c3a8', color2: '#8a7fa8' },
  { name: 'Ember', color: '#f2b28a', color2: '#b5523b' },
  { name: 'Ice', color: '#f4f8fa', color2: '#6797b8' },
];

interface LightsSectionProps {
  clip: VisualClip;
  patch: (patch: Partial<VisualClip> | ((clip: VisualClip) => Partial<VisualClip>), key?: string) => void;
}

/** Lightroom-style lights painted onto the photo or video itself. */
export function LightsSection({ clip, patch }: LightsSectionProps) {
  const [openId, setOpenId] = useState<string | null>(clip.lights.at(-1)?.id ?? null);

  const add = (type: LightType) => {
    const light = createLight(type);
    patch((c) => ({ lights: [...c.lights, light] }));
    setOpenId(light.id);
  };
  const update = (id: string, next: Partial<LightEffect>, key?: string) =>
    patch((c) => ({ lights: c.lights.map((l) => (l.id === id ? { ...l, ...next } : l)) }), key ? `light.${id}.${key}` : undefined);
  const remove = (id: string) => patch((c) => ({ lights: c.lights.filter((l) => l.id !== id) }));

  return (
    <Section title="Light effects" icon="sun" defaultOpen={clip.lights.length > 0}>
      <div className="light-grid" role="group" aria-label="Add a light">
        {LIGHT_OPTIONS.map((option) => (
          <button key={option.value} type="button" className={`light-tile light-tile--${option.value}`} title={option.hint} onClick={() => add(option.value)}>
            <span className="light-tile__swatch" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      {clip.lights.length === 0 && <p className="panel-note">Add a glow, halo, lamp, eclipse, flare, leak or beam. Each has its own colours, softness, shape, blend and movement. Lights follow the picture when it moves or zooms.</p>}

      {clip.lights.map((light, i) => {
        const label = LIGHT_OPTIONS.find((o) => o.value === light.type)?.label ?? light.type;
        const open = openId === light.id;
        return (
          <div className={`light-card ${open ? 'is-open' : ''}`} key={light.id}>
            <div className="light-card__header">
              <button type="button" className="light-card__title" aria-expanded={open} onClick={() => setOpenId(open ? null : light.id)}>
                <span className="light-card__dot" style={{ background: light.color }} aria-hidden="true" />
                {label} {i + 1}
              </button>
              <IconButton icon="trash" label={`Remove ${label}`} size={14} onClick={() => remove(light.id)} />
            </div>
            {open && (
              <div className="light-card__body">
                <span className="light-card__group">Placement</span>
                <div className="field-row">
                  <Slider label="Position X" value={light.x} min={0} max={1} format={pct} onChange={(x) => update(light.id, { x }, 'x')} />
                  <Slider label="Position Y" value={light.y} min={0} max={1} format={pct} onChange={(y) => update(light.id, { y }, 'y')} />
                </div>
                <div className="field-row">
                  <Slider label="Size" value={light.size} min={0.05} max={1.5} format={pct} onChange={(size) => update(light.id, { size }, 'size')} />
                  <Slider label="Intensity" value={light.intensity} min={0} max={1.5} format={pct} onChange={(intensity) => update(light.id, { intensity }, 'intensity')} />
                </div>

                <span className="light-card__group">Shape</span>
                <div className="field-row">
                  <Slider label={light.type === 'halo' ? 'Ring width' : 'Softness'} value={light.softness} min={0} max={1} defaultValue={0.5} format={pct} onChange={(softness) => update(light.id, { softness }, 'softness')} />
                  {light.type !== 'glow' && (
                    <Slider label="Stretch" value={light.stretch} min={0.25} max={4} step={0.05} defaultValue={1} format={(v) => (v === 1 ? 'Round' : `${v.toFixed(2)}×`)} onChange={(stretch) => update(light.id, { stretch }, 'stretch')} />
                  )}
                </div>
                {light.type !== 'glow' && (ANGLED_LIGHTS.includes(light.type) || light.stretch !== 1 || light.animation === 'spin') && (
                  <Slider label="Angle" value={light.angle} min={-180} max={180} step={1} defaultValue={0} format={(v) => `${v}°`} onChange={(angle) => update(light.id, { angle }, 'angle')} />
                )}

                <span className="light-card__group">Colour</span>
                <div className="chip-row" role="group" aria-label="Light colour presets">
                  {LIGHT_PALETTES.map((p) => (
                    <button key={p.name} type="button" className="chip light-chip" onClick={() => update(light.id, { color: p.color, color2: p.color2 })}>
                      <span className="light-chip__swatch" style={{ background: `radial-gradient(circle, ${p.color}, ${p.color2})` }} aria-hidden="true" />
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="field-row">
                  <ColorField label={light.type === 'glow' ? 'Tint' : 'Core colour'} value={light.color} onChange={(color) => update(light.id, { color }, 'color')} />
                  <ColorField label="Edge colour" value={light.color2} onChange={(color2) => update(light.id, { color2 }, 'color2')} />
                </div>
                <Select label="Blend" value={light.blend} options={BLEND_OPTIONS} onChange={(blend) => update(light.id, { blend })} />

                <span className="light-card__group">Movement</span>
                <div className="field-row">
                  <Select label="Animation" value={light.animation} options={ANIMATION_OPTIONS} onChange={(animation) => update(light.id, { animation })} />
                  {light.animation !== 'none' && (
                    <Slider label="Speed" value={light.speed} min={0.1} max={4} step={0.05} defaultValue={1} format={(v) => `${v.toFixed(2)}×`} onChange={(speed) => update(light.id, { speed }, 'speed')} />
                  )}
                </div>
                <Toggle label="Pulse on the beat" checked={light.pulseOnBeat} onChange={(pulseOnBeat) => update(light.id, { pulseOnBeat })} />
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}
