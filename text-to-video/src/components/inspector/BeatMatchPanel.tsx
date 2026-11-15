import { useId, useMemo, useState } from 'react';
import { matchBeats, matchCandidates, type BeatMatchMode, type BeatMatchOptions } from '../../engine/beatMatch';
import { formatSpeed } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import type { AudioClip } from '../../types/project';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';

interface BeatMatchPanelProps {
  /** Pre-select this song as the base (e.g. the selected music clip). */
  preferredBaseId?: string;
}

const MODES: { label: string; value: BeatMatchMode; title: string }[] = [
  { label: 'Follow base', value: 'follow-base', title: 'The base song keeps its tempo; the others adapt' },
  { label: 'Meet halfway', value: 'meet', title: 'Every song moves to a tempo in between' },
  { label: 'Custom BPM', value: 'custom', title: 'Every song moves to the tempo you type' },
];

/**
 * Auto beat merge: when two or more songs have different tempos, re-time them
 * onto one grid. Pitch, volume, fades and visual edits are preserved.
 */
export function BeatMatchPanel({ preferredBaseId }: BeatMatchPanelProps) {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const apply = useEditor((s) => s.matchBeats);
  const candidates = useMemo(() => matchCandidates(project, assets), [project, assets]);
  const bpmId = useId();

  const [chosenBase, setBaseId] = useState<string | undefined>(preferredBaseId);
  const [mode, setMode] = useState<BeatMatchMode>('follow-base');
  const [customBpm, setCustomBpm] = useState(120);
  const [alignPhase, setAlignPhase] = useState(true);
  const [keepEditsOnBeat, setKeepEdits] = useState(true);

  const baseId = candidates.some((c) => c.clip.id === chosenBase) ? chosenBase! : candidates[0]?.clip.id ?? '';
  const options = useMemo<BeatMatchOptions>(
    () => ({ baseClipId: baseId, mode, customBpm, alignPhase, keepEditsOnBeat }),
    [baseId, mode, customBpm, alignPhase, keepEditsOnBeat],
  );
  // Dry run of the real algorithm, so the list shows exactly what "Match" will do.
  const preview = useMemo(() => matchBeats(project, assets, options), [project, assets, options]);
  const tempoChanges = candidates.filter(({ clip }) => {
    const next = preview.clips.find((c) => c.id === clip.id);
    return next?.kind === 'audio' && Math.abs(next.speed - clip.speed) > 1e-4;
  }).length;

  const minimum = mode === 'custom' ? 1 : 2;
  if (candidates.length < minimum) {
    return (
      <Section title="Beat match" icon="merge" defaultOpen={false}>
        <p className="panel-note">
          Add two or more songs to merge their beats. Each song’s tempo is detected on import; matching re-times them onto
          one grid while keeping pitch, volume, fades and your edits.
        </p>
      </Section>
    );
  }

  const nameOf = (clip: AudioClip) => assets[clip.assetId]?.name ?? 'Song';

  return (
    <Section title="Beat match" icon="merge">
      <div className="match-list" role="radiogroup" aria-label="Base song">
        {candidates.map(({ clip, bpm }) => {
          const next = preview.clips.find((c) => c.id === clip.id) as AudioClip | undefined;
          const nextBpm = next ? bpm * (next.speed / clip.speed) : bpm;
          const changed = next !== undefined && Math.abs(next.speed - clip.speed) > 1e-4;
          const isBase = clip.id === baseId;
          return (
            <button
              key={clip.id}
              type="button"
              role="radio"
              aria-checked={isBase}
              className={`match-row ${isBase ? 'is-base' : ''}`}
              onClick={() => setBaseId(clip.id)}
              disabled={mode === 'custom'}
            >
              <span className="match-row__radio" aria-hidden="true" />
              <span className="match-row__name" title={nameOf(clip)}>
                {nameOf(clip)}
                {isBase && mode !== 'custom' && <span className="tag tag--positive">Base</span>}
              </span>
              <span className="match-row__bpm">
                {Math.round(bpm)}
                {changed && (
                  <>
                    <span className="match-row__arrow">→</span>
                    <strong>{Math.round(nextBpm)}</strong>
                  </>
                )}
                <small>BPM</small>
              </span>
              <span className={`match-row__speed ${changed ? 'is-changed' : ''}`}>
                {changed ? `${formatSpeed(clip.speed)} → ${formatSpeed(next!.speed)}` : 'unchanged'}
              </span>
            </button>
          );
        })}
      </div>

      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />
      {mode === 'custom' && (
        <div className="field">
          <label className="field__label" htmlFor={bpmId}>
            <span>Target tempo</span>
          </label>
          <input
            id={bpmId}
            type="text"
            inputMode="numeric"
            value={customBpm}
            onChange={(e) => {
              const value = Number(e.target.value.replace(/[^\d.]/g, ''));
              if (Number.isFinite(value)) setCustomBpm(Math.min(240, value));
            }}
          />
        </div>
      )}
      <Toggle label="Align downbeats" hint="Nudge songs so their beats land on the same grid" checked={alignPhase} onChange={setAlignPhase} />
      <Toggle label="Keep my edits on the beat" hint="Cuts and text that sat on a beat move with it" checked={keepEditsOnBeat} onChange={setKeepEdits} />
      <Button variant="primary" icon="merge" disabled={preview.changed === 0} onClick={() => apply(options)}>
        {preview.changed === 0 ? 'Already matched' : tempoChanges === 0 ? 'Align beats' : `Match to ${Math.round(preview.target)} BPM`}
      </Button>
      <p className="panel-note">Songs are paired at the nearest octave, so a 70 BPM track fits a 140 BPM one at its natural speed. Undo restores everything.</p>
    </Section>
  );
}
