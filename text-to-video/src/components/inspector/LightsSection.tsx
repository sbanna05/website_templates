import { useState } from 'react';
import { createLight } from '../../config/defaults';
import { LIGHT_OPTIONS } from '../../config/options';
import type { LightEffect, LightType, VisualClip } from '../../types/project';
import { IconButton } from '../ui/Button';
import { ColorField } from '../ui/ColorField';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Light types that have a direction. */
const ANGLED: LightType[] = ['flare', 'leak', 'beam'];

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
      {clip.lights.length === 0 && <p className="panel-note">Add a lamp, eclipse glow, flare or leak. Lights follow the image when it moves or zooms.</p>}

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
                {light.type !== 'glow' && (
                  <div className="field-row">
                    <Slider label="Position X" value={light.x} min={0} max={1} format={pct} onChange={(x) => update(light.id, { x }, 'x')} />
                    <Slider label="Position Y" value={light.y} min={0} max={1} format={pct} onChange={(y) => update(light.id, { y }, 'y')} />
                  </div>
                )}
                <div className="field-row">
                  <Slider label="Size" value={light.size} min={0.05} max={1.5} format={pct} onChange={(size) => update(light.id, { size }, 'size')} />
                  <Slider label="Intensity" value={light.intensity} min={0} max={1} format={pct} onChange={(intensity) => update(light.id, { intensity }, 'intensity')} />
                </div>
                {ANGLED.includes(light.type) && (
                  <Slider label="Angle" value={light.angle} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(angle) => update(light.id, { angle }, 'angle')} />
                )}
                {light.type !== 'glow' && <ColorField label="Light color" value={light.color} onChange={(color) => update(light.id, { color }, 'color')} />}
                <Toggle label="Pulse on the beat" checked={light.pulseOnBeat} onChange={(pulseOnBeat) => update(light.id, { pulseOnBeat })} />
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}
