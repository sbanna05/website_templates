import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SOUND_PRESETS } from '../../audio/effects';
import { BEAT_FX_OPTIONS, MOTION_OPTIONS, PITCH_RANGE, SPEED_PRESETS, TEXT_IN_OPTIONS, TRANSITION_OPTIONS } from '../../config/options';
import { EQ_PRESETS } from '../../engine/eq';
import { healClips, mergeBlocker, spanOf, type MergeLayout } from '../../engine/merge';
import { STEM_PRESETS, presetMix } from '../../engine/stems';
import { isMediaClip, withSpeed } from '../../engine/timeline';
import { formatSpeed } from '../../lib/time';
import { selectSelectedClips, useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { AudioClip, Clip, TextClip, VisualClip } from '../../types/project';
import { Button } from '../ui/Button';
import { ColorField } from '../ui/ColorField';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (v: number) => `${v.toFixed(2)}s`;

const MERGE_LAYOUTS: { label: string; value: MergeLayout; title: string }[] = [
  { label: 'Back to back', value: 'back-to-back', title: 'Close the gaps — the parts play one right after another' },
  { label: 'As placed', value: 'as-placed', title: 'Keep the timing — gaps stay silent, overlaps play together' },
];

/** Shows "mixed" when the selected clips disagree on a value. */
const shared = <T,>(values: readonly T[]): { value: T; mixed: boolean } => ({
  value: values[0],
  mixed: values.some((v) => JSON.stringify(v) !== JSON.stringify(values[0])),
});
const labelled = (label: string, mixed: boolean) => (mixed ? `${label} · mixed` : label);

/**
 * Batch editing: every control here changes all selected clips of the matching
 * kind at once, as one undo step — like multi-select in a DAW or CapCut.
 */
export function MultiInspector() {
  const clips = useEditor(useShallow(selectSelectedClips));
  const assets = useEditor((s) => s.assets);
  const { updateClips, deleteClips, duplicateClips, mergeClips, select } = useEditor.getState();
  const [layout, setLayout] = useState<MergeLayout>('back-to-back');

  const media = clips.filter(isMediaClip);
  const audio = clips.filter((c): c is AudioClip => c.kind === 'audio');
  const visual = clips.filter((c): c is VisualClip => c.kind === 'visual');
  const text = clips.filter((c): c is TextClip => c.kind === 'text');
  const withStems = audio.filter((c) => assets[c.assetId]?.stems);

  const edit = <T extends Clip>(targets: readonly T[], recipe: (clip: T) => Partial<T>, key?: string) => {
    const ids = new Set(targets.map((c) => c.id));
    updateClips([...ids], (c) => (ids.has(c.id) ? ({ ...c, ...recipe(c as T) } as Clip) : c), key);
  };

  const blocker = mergeBlocker(clips);
  const lossless = !blocker && clips.every(isMediaClip) && healClips(media) !== null;
  const { start } = spanOf(clips);

  const volume = shared(media.map((c) => c.volume));
  const speed = shared(media.map((c) => c.speed));
  const pitch = shared(audio.map((c) => c.pitch));
  const fadeIn = shared(audio.map((c) => c.fadeIn));
  const fadeOut = shared(audio.map((c) => c.fadeOut));

  return (
    <>
      <div className="multi-summary">
        <strong>{clips.length} clips selected</strong>
        <p>
          {[audio.length && `${audio.length} music`, visual.length && `${visual.length} video/photo`, text.length && `${text.length} text`]
            .filter(Boolean)
            .join(' · ')}
          . Changes apply to all of them.
        </p>
        <div className="button-row">
          <Button size="sm" icon="copy" onClick={() => duplicateClips(clips.map((c) => c.id))}>
            Duplicate
          </Button>
          <Button size="sm" variant="ghost" icon="trash" onClick={() => deleteClips(clips.map((c) => c.id))}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" icon="close" onClick={() => select(null)}>
            Deselect
          </Button>
        </div>
      </div>

      <Section title="Merge parts" icon="merge">
        {blocker ? (
          <p className="panel-note">{blocker}.</p>
        ) : lossless ? (
          <p className="panel-note">These parts are cut from the same stretch of one file and sit edge to edge — they join back into one clip, losslessly.</p>
        ) : (
          <>
            <Segmented label="Join" value={layout} options={MERGE_LAYOUTS} onChange={setLayout} />
            <p className="panel-note">
              The parts are rendered into one new song file — speed, pitch, stems, EQ, effects and volume curves baked in — and
              replace the originals. Undo brings the parts back.
            </p>
          </>
        )}
        <Button variant="primary" icon="merge" disabled={Boolean(blocker)} onClick={() => void mergeClips(clips.map((c) => c.id), layout)}>
          {lossless ? 'Join into one clip' : `Merge ${clips.length} parts`}
        </Button>
      </Section>

      <Section title="Arrange" icon="layers">
        <Button
          size="sm"
          icon="flag"
          title="Move the whole selection so it starts at the playhead, keeping its spacing"
          onClick={() => {
            const shift = usePlayback.getState().time - start;
            edit(clips, (c) => ({ start: Math.max(0, c.start + shift) }));
          }}
        >
          Move group to playhead
        </Button>
      </Section>

      {media.length > 0 && (
        <Section title={`Volume & speed · ${media.length}`} icon="volume">
          <Slider label={labelled('Volume', volume.mixed)} value={volume.value} min={0} max={2} defaultValue={1} format={pct} onChange={(v) => edit(media, () => ({ volume: v }), 'volume')} />
          <div className="chip-row" role="group" aria-label={labelled('Speed', speed.mixed)}>
            {SPEED_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`chip ${!speed.mixed && Math.abs(speed.value - preset) < 1e-3 ? 'is-active' : ''}`}
                onClick={() => edit(media, (c) => withSpeed(c, preset, assets[c.assetId]))}
              >
                {formatSpeed(preset)}
              </button>
            ))}
          </div>
        </Section>
      )}

      {audio.length > 0 && (
        <Section title={`Music · ${audio.length}`} icon="music">
          <div className="field-row">
            <Slider label={labelled('Fade in', fadeIn.mixed)} value={fadeIn.value} min={0} max={5} step={0.05} defaultValue={0} format={secs} onChange={(v) => edit(audio, () => ({ fadeIn: v }), 'fadeIn')} />
            <Slider label={labelled('Fade out', fadeOut.mixed)} value={fadeOut.value} min={0} max={5} step={0.05} defaultValue={0} format={secs} onChange={(v) => edit(audio, () => ({ fadeOut: v }), 'fadeOut')} />
          </div>
          <Slider
            label={labelled('Pitch', pitch.mixed)}
            value={pitch.value}
            min={PITCH_RANGE.min}
            max={PITCH_RANGE.max}
            step={1}
            defaultValue={0}
            format={(v) => (v === 0 ? 'Original' : `${v > 0 ? '+' : ''}${v} st`)}
            onChange={(v) => edit(audio, () => ({ pitch: v }), 'pitch')}
          />
          <span className="field__label">Sound</span>
          <div className="chip-row" role="group" aria-label="Sound presets">
            {SOUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.hint}
                className="chip"
                onClick={() =>
                  edit(audio, (c) => ({
                    ...(preset.speed !== undefined ? withSpeed(c, preset.speed, assets[c.assetId]) : {}),
                    effects: { ...preset.effects },
                    pitch: preset.pitch ?? c.pitch,
                  }))
                }
              >
                {preset.name}
              </button>
            ))}
          </div>
          <span className="field__label">EQ</span>
          <div className="chip-row" role="group" aria-label="EQ presets">
            {EQ_PRESETS.map((preset) => (
              <button key={preset.id} type="button" title={preset.hint} className="chip" onClick={() => edit(audio, () => ({ eq: { ...preset.eq } }))}>
                {preset.name}
              </button>
            ))}
          </div>
          {withStems.length > 0 && (
            <>
              <span className="field__label">Stems · {withStems.length} split</span>
              <div className="chip-row" role="group" aria-label="Stem presets">
                {STEM_PRESETS.map((preset) => (
                  <button key={preset.id} type="button" title={preset.hint} className="chip" onClick={() => edit(withStems, () => ({ stems: presetMix(preset) }))}>
                    {preset.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      {visual.length > 0 && (
        <Section title={`Video & photos · ${visual.length}`} icon="film">
          <Select
            label={labelled('Transition in', shared(visual.map((c) => c.transitionIn.type)).mixed)}
            value={visual[0].transitionIn.type}
            options={TRANSITION_OPTIONS}
            onChange={(type) => edit(visual, (c) => ({ transitionIn: { ...c.transitionIn, type } }))}
          />
          <Select
            label={labelled('Transition out', shared(visual.map((c) => c.transitionOut.type)).mixed)}
            value={visual[0].transitionOut.type}
            options={TRANSITION_OPTIONS}
            onChange={(type) => edit(visual, (c) => ({ transitionOut: { ...c.transitionOut, type } }))}
          />
          <Select
            label={labelled('Motion', shared(visual.map((c) => c.motion)).mixed)}
            value={visual[0].motion}
            options={MOTION_OPTIONS}
            onChange={(motion) => edit(visual, () => ({ motion }))}
          />
          <Select
            label={labelled('Beat effect', shared(visual.map((c) => c.beatFx.type)).mixed)}
            value={visual[0].beatFx.type}
            options={BEAT_FX_OPTIONS}
            onChange={(type) => edit(visual, (c) => ({ beatFx: { ...c.beatFx, type } }))}
          />
        </Section>
      )}

      {text.length > 0 && (
        <Section title={`Text · ${text.length}`} icon="text">
          <ColorField label={labelled('Text colour', shared(text.map((c) => c.style.color)).mixed)} value={text[0].style.color} onChange={(color) => edit(text, (c) => ({ style: { ...c.style, color } }), 'text-color')} />
          <Select
            label={labelled('Animation in', shared(text.map((c) => c.animation.in)).mixed)}
            value={text[0].animation.in}
            options={TEXT_IN_OPTIONS}
            onChange={(value) => edit(text, (c) => ({ animation: { ...c.animation, in: value } }))}
          />
        </Section>
      )}
    </>
  );
}
