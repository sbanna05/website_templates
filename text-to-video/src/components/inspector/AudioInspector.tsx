import { PITCH_RANGE } from '../../config/options';
import { withSpeed } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import type { AudioClip } from '../../types/project';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { Waveform } from '../timeline/Waveform';
import { BeatMatchPanel } from './BeatMatchPanel';
import { SpeedSection } from './SpeedSection';
import { useClipPatch } from './useClipPatch';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (v: number) => `${v.toFixed(2)}s`;
const PITCH_PRESETS = [-12, -7, -5, 0, 5, 7, 12];

export function AudioInspector({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const patch = useClipPatch(clip);
  const bpm = asset?.beats?.bpm ?? 0;

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

      <BeatMatchPanel preferredBaseId={clip.id} />

      <Section title="Beat sync" icon="beat">
        <div className="stat-row">
          <div className="stat">
            <strong>{bpm ? Math.round(bpm * clip.speed) : '—'}</strong>
            <span>BPM {clip.speed !== 1 && bpm ? `(orig. ${Math.round(bpm)})` : ''}</span>
          </div>
          <div className="stat">
            <strong>{asset?.beats?.beats.length ?? '—'}</strong>
            <span>beats found</span>
          </div>
        </div>
        <Toggle
          label="Drive beat sync"
          hint="Beat effects, snapping and on-beat text follow this track"
          checked={clip.beatSource}
          onChange={(beatSource) => patch({ beatSource })}
        />
        <Slider
          label="Grid offset"
          value={clip.beatOffset}
          min={-0.5}
          max={0.5}
          step={0.005}
          defaultValue={0}
          format={(v) => `${v >= 0 ? '+' : ''}${Math.round(v * 1000)} ms`}
          onChange={(beatOffset) => patch({ beatOffset }, 'beatOffset')}
        />
      </Section>
    </>
  );
}
