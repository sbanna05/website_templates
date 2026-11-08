import { SOUND_PRESETS, lowpassHz, reverbSeconds, type SoundPreset } from '../../audio/effects';
import { withSpeed } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import type { AudioClip, AudioEffects } from '../../types/project';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { useClipPatch } from './useClipPatch';

const pct = (v: number) => `${Math.round(v * 100)}%`;

const isActive = (clip: AudioClip, preset: SoundPreset) =>
  (Object.keys(preset.effects) as (keyof AudioEffects)[]).every((k) => clip.effects[k] === preset.effects[k]) &&
  (preset.speed === undefined || Math.abs(clip.speed - preset.speed) < 1e-3) &&
  (preset.pitch === undefined || clip.pitch === preset.pitch);

/** Sound design: one-tap presets (Slowed + reverb, Lo-fi…) plus the raw controls behind them. */
export function SoundSection({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const patch = useClipPatch(clip);
  const fx = clip.effects;
  const setFx = (next: Partial<AudioEffects>, key?: string) => patch((c) => ({ effects: { ...c.effects, ...next } }), key);

  const applyPreset = (preset: SoundPreset) =>
    patch((c) => {
      const timed = preset.speed !== undefined ? withSpeed(c, preset.speed, asset) : c;
      return { ...timed, effects: { ...preset.effects }, pitch: preset.pitch ?? c.pitch };
    });

  return (
    <Section title="Sound" icon="sparkle">
      <div className="chip-row" role="group" aria-label="Sound presets">
        {SOUND_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.hint}
            className={`chip ${isActive(clip, preset) ? 'is-active' : ''}`}
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <Slider label="Reverb" value={fx.reverb} min={0} max={1} defaultValue={0} format={pct} onChange={(reverb) => setFx({ reverb }, 'reverb')} />
      {fx.reverb > 0 && (
        <Slider
          label="Room size"
          value={fx.roomSize}
          min={0}
          max={1}
          defaultValue={0.5}
          format={(v) => `${reverbSeconds(v).toFixed(1)} s tail`}
          onChange={(roomSize) => setFx({ roomSize }, 'roomSize')}
        />
      )}
      <Slider
        label="Muffle"
        value={fx.lowpass}
        min={0}
        max={1}
        defaultValue={0}
        format={(v) => (v === 0 ? 'Open' : `${Math.round(lowpassHz(v) / 100) / 10} kHz`)}
        onChange={(lowpass) => setFx({ lowpass }, 'lowpass')}
      />
      <p className="panel-note">
        “Slowed + reverb” drops speed and pitch together, like a tape slowed down. To remove or isolate vocals, use
        <strong> Stems</strong> below — real AI separation.
      </p>
    </Section>
  );
}
