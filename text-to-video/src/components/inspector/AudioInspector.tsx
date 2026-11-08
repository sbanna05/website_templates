import { PITCH_RANGE } from '../../config/options';
import { isFlatEq } from '../../engine/eq';
import { withSpeed } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import type { AudioClip } from '../../types/project';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { Waveform } from '../timeline/Waveform';
import { BeatGridSection } from './BeatGridSection';
import { BeatMatchPanel } from './BeatMatchPanel';
import { EqEditor } from './EqEditor';
import { LyricsSection } from './LyricsSection';
import { SectionCutter } from './SectionCutter';
import { SoundSection } from './SoundSection';
import { SpeedSection } from './SpeedSection';
import { StemsSection } from './StemsSection';
import { VolumeCurveEditor } from './VolumeCurveEditor';
import { useClipPatch } from './useClipPatch';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (v: number) => `${v.toFixed(2)}s`;
const PITCH_PRESETS = [-12, -7, -5, 0, 5, 7, 12];

export function AudioInspector({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const patch = useClipPatch(clip);

  return (
    <>
      {asset?.waveform && (
        <div className="inspector-wave">
          <Waveform peaks={asset.waveform} />
        </div>
      )}

      <SpeedSection
        speed={clip.speed}
        onChange={(speed, key) => patch((c) => withSpeed(c, speed, asset), key)}
        note="Tempo changes keep the original pitch — use Pitch below to transpose independently."
      />

      <Section title="Pitch" icon="music">
        <div className="chip-row" role="group" aria-label="Pitch presets">
          {PITCH_PRESETS.map((p) => (
            <button key={p} type="button" className={`chip ${clip.pitch === p ? 'is-active' : ''}`} onClick={() => patch({ pitch: p })}>
              {p > 0 ? `+${p}` : p}
            </button>
          ))}
        </div>
        <Slider
          label="Semitones"
          value={clip.pitch}
          min={PITCH_RANGE.min}
          max={PITCH_RANGE.max}
          step={1}
          defaultValue={0}
          format={(v) => (v === 0 ? 'Original' : `${v > 0 ? '+' : ''}${v} st`)}
          onChange={(pitch) => patch({ pitch }, 'pitch')}
        />
      </Section>

      <Section title="Volume & fades" icon="volume">
        <Slider label="Volume" value={clip.volume} min={0} max={2} defaultValue={1} format={pct} onChange={(volume) => patch({ volume }, 'volume')} />
        <div className="field-row">
          <Slider label="Fade in" value={clip.fadeIn} min={0} max={5} step={0.05} defaultValue={0} format={secs} onChange={(fadeIn) => patch({ fadeIn }, 'fadeIn')} />
          <Slider label="Fade out" value={clip.fadeOut} min={0} max={5} step={0.05} defaultValue={0} format={secs} onChange={(fadeOut) => patch({ fadeOut }, 'fadeOut')} />
        </div>
      </Section>

      <StemsSection clip={clip} />
      <Section title="EQ" icon="sliders" defaultOpen={!isFlatEq(clip.eq)}>
        <EqEditor label="Clip EQ" eq={clip.eq} onChange={(eq, key) => patch({ eq }, key)} />
      </Section>
      <SoundSection clip={clip} />
      <VolumeCurveEditor clip={clip} />

      <BeatGridSection clip={clip} />
      <SectionCutter key={clip.id} clip={clip} />
      <BeatMatchPanel preferredBaseId={clip.id} />
      <LyricsSection clip={clip} />
    </>
  );
}
