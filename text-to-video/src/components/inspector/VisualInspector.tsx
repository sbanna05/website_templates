import { NEUTRAL_FILTERS } from '../../config/defaults';
import { BEAT_FX_OPTIONS, MOTION_OPTIONS, PITCH_RANGE, TRANSITION_OPTIONS } from '../../config/options';
import { FILTER_PRESETS } from '../../config/presets';
import { withSpeed } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import type { Filters, Transition, VisualClip } from '../../types/project';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { SpeedSection } from './SpeedSection';
import { TransformSection } from './TransformSection';
import { useClipPatch } from './useClipPatch';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (v: number) => `${v.toFixed(2)}s`;
const semis = (v: number) => (v === 0 ? '0 st' : `${v > 0 ? '+' : ''}${v} st`);

export function VisualInspector({ clip }: { clip: VisualClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const patch = useClipPatch(clip);
  const isVideo = asset?.kind === 'video';

  const setFilter = <K extends keyof Filters>(key: K) => (value: number) =>
    patch((c) => ({ filters: { ...c.filters, [key]: value } }), `filters.${key}`);
  const setTransition = (which: 'transitionIn' | 'transitionOut', next: Partial<Transition>, key?: string) =>
    patch((c) => ({ [which]: { ...c[which], ...next } }), key);

  return (
    <>
      {isVideo && (
        <SpeedSection
          speed={clip.speed}
          onChange={(speed, key) => patch((c) => withSpeed(c, speed, asset), key)}
          note="Clip length on the timeline adjusts automatically. Audio keeps its pitch."
        />
      )}

      <TransformSection transform={clip.transform} scaleLabel="Zoom" onChange={(transform, key) => patch({ transform }, key)} />
      <Section title="Framing" icon="image" defaultOpen={false}>
        <Segmented
          label="Fit"
          value={clip.fit}
          options={[
            { label: 'Fill frame', value: 'cover' },
            { label: 'Fit inside', value: 'contain' },
          ]}
          onChange={(fit) => patch({ fit })}
        />
      </Section>

      <Section title="Motion" icon="sparkle">
        <Select label="Camera move" value={clip.motion} options={MOTION_OPTIONS} onChange={(motion) => patch({ motion })} />
        {clip.motion !== 'none' && (
          <Slider label="Amount" value={clip.motionAmount} min={0.02} max={0.5} step={0.01} defaultValue={0.12} format={pct} onChange={(v) => patch({ motionAmount: v }, 'motionAmount')} />
        )}
      </Section>

      <Section title="Beat effects" icon="beat">
        <Select label="On every beat" value={clip.beatFx.type} options={BEAT_FX_OPTIONS} onChange={(type) => patch((c) => ({ beatFx: { ...c.beatFx, type } }))} />
        {clip.beatFx.type !== 'none' && (
          <Slider label="Intensity" value={clip.beatFx.intensity} min={0.05} max={1} step={0.01} defaultValue={0.5} format={pct}
            onChange={(intensity) => patch((c) => ({ beatFx: { ...c.beatFx, intensity } }), 'beatFx.intensity')} />
        )}
      </Section>

      <Section title="Transitions" icon="layers">
        <div className="field-row">
          <Select label="In" value={clip.transitionIn.type} options={TRANSITION_OPTIONS} onChange={(type) => setTransition('transitionIn', { type })} />
          <Select label="Out" value={clip.transitionOut.type} options={TRANSITION_OPTIONS} onChange={(type) => setTransition('transitionOut', { type })} />
        </div>
        <div className="field-row">
          <Slider label="In length" value={clip.transitionIn.duration} min={0.05} max={2} step={0.05} format={secs} onChange={(duration) => setTransition('transitionIn', { duration }, 'tin')} />
          <Slider label="Out length" value={clip.transitionOut.duration} min={0.05} max={2} step={0.05} format={secs} onChange={(duration) => setTransition('transitionOut', { duration }, 'tout')} />
        </div>
      </Section>

      <Section title="Color & filters" icon="sliders" defaultOpen={false}>
        <div className="chip-row" role="group" aria-label="Filter presets">
          {FILTER_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className="chip" onClick={() => patch({ filters: { ...preset.filters } })}>
              {preset.name}
            </button>
          ))}
        </div>
        <Slider label="Brightness" value={clip.filters.brightness} min={0.3} max={1.8} defaultValue={NEUTRAL_FILTERS.brightness} format={pct} onChange={setFilter('brightness')} />
        <Slider label="Contrast" value={clip.filters.contrast} min={0.3} max={1.8} defaultValue={NEUTRAL_FILTERS.contrast} format={pct} onChange={setFilter('contrast')} />
        <Slider label="Saturation" value={clip.filters.saturation} min={0} max={2} defaultValue={NEUTRAL_FILTERS.saturation} format={pct} onChange={setFilter('saturation')} />
        <Slider label="Hue shift" value={clip.filters.hue} min={-180} max={180} step={1} defaultValue={0} format={(v) => `${v}°`} onChange={setFilter('hue')} />
        <Slider label="Blur" value={clip.filters.blur} min={0} max={20} step={0.1} defaultValue={0} format={(v) => `${v.toFixed(1)}px`} onChange={setFilter('blur')} />
        <Slider label="Vignette" value={clip.filters.vignette} min={0} max={1} defaultValue={0} format={pct} onChange={setFilter('vignette')} />
      </Section>

      {asset?.hasAudio && (
        <Section title="Clip audio" icon="volume" defaultOpen={false}>
          <Slider label="Volume" value={clip.volume} min={0} max={2} defaultValue={1} format={pct} onChange={(volume) => patch({ volume }, 'volume')} />
          <Slider label="Pitch" value={clip.pitch} min={PITCH_RANGE.min} max={PITCH_RANGE.max} step={1} defaultValue={0} format={semis} onChange={(pitch) => patch({ pitch }, 'pitch')} />
        </Section>
      )}
    </>
  );
}
