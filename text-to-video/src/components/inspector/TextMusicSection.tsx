import { useMemo, useState } from 'react';
import { TEXT_LOOP_OPTIONS } from '../../config/options';
import { timelineBeats } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import type { TextClip, TextLoopAnimation } from '../../types/project';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';

const BEAT_LOOPS = TEXT_LOOP_OPTIONS.filter((o) => o.value === 'none' || o.value.startsWith('beat-'));
/** "Beat color swap" → "Color swap" */
const shortLabel = (label: string) => {
  const rest = label.replace(/^Beat /, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

interface TextMusicSectionProps {
  clip: TextClip;
  patch: (patch: Partial<TextClip> | ((clip: TextClip) => Partial<TextClip>), key?: string) => void;
}

/** Everything that ties a text layer to the music, in one place. */
export function TextMusicSection({ clip, patch }: TextMusicSectionProps) {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const splitTextOnBeats = useEditor((s) => s.splitTextOnBeats);
  const beatCount = useMemo(() => timelineBeats(project, assets).length, [project, assets]);
  const [unit, setUnit] = useState<'word' | 'line'>(clip.text.includes('\n') ? 'line' : 'word');
  const [every, setEvery] = useState(1);
  const hasBeats = beatCount > 1;

  return (
    <Section title="Sync to music" icon="beat">
      {!hasBeats && <p className="panel-note">Add a song (or tap beats with B) to unlock beat sync for text.</p>}
      <Toggle
        label="Reveal on the beat"
        hint="Each word / letter lands on the next beat"
        checked={clip.animation.revealOnBeat}
        onChange={(revealOnBeat) => patch((c) => ({ animation: { ...c.animation, revealOnBeat } }))}
      />
      <div className="field">
        <span className="field__label">Move with the beat</span>
        <div className="chip-row" role="radiogroup" aria-label="Move with the beat">
          {BEAT_LOOPS.map((option) => {
            const active = clip.animation.loop === option.value || (option.value === 'none' && !clip.animation.loop.startsWith('beat-'));
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={`chip ${active ? 'is-active' : ''}`}
                onClick={() => patch((c) => ({ animation: { ...c.animation, loop: option.value as TextLoopAnimation } }))}
              >
                {shortLabel(option.label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sync-card">
        <strong>Lyric mode</strong>
        <p>Split this text into one clip per {unit}, each starting on its own beat.</p>
        <div className="field-row">
          <Segmented
            label="Split by"
            value={unit}
            options={[
              { label: 'Word', value: 'word' },
              { label: 'Line', value: 'line' },
            ]}
            onChange={setUnit}
          />
          <Segmented
            label="Beats each"
            value={every}
            options={[1, 2, 4].map((n) => ({ label: String(n), value: n }))}
            onChange={setEvery}
          />
        </div>
        <Button variant="primary" size="sm" icon="wand" disabled={!hasBeats} onClick={() => splitTextOnBeats(clip.id, unit, every)}>
          Split onto beats
        </Button>
      </div>
      <p className="panel-note">Tip: with a text clip selected, “Sync” in the timeline toolbar lines up every clip on its track with the beat or your marks.</p>
    </Section>
  );
}
