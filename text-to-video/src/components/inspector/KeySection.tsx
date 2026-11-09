import { useMemo, useState, type CSSProperties } from 'react';
import { chordColor } from '../../config/trackColors';
import { camelotCode, chordName, clipKey, compatibleCodes, keyCompatibility, keyName, type KeyMatch } from '../../engine/musicTheory';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { AudioClip } from '../../types/project';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';

const MATCH_LABEL: Record<KeyMatch, string> = { same: 'Same key', perfect: 'Mixes well', energy: 'Energy boost', clash: 'Clashes' };

/**
 * Key & chords, DJ-software style: the song's key (with Camelot code), which
 * keys mix with it, how the other songs in the edit compare, and its chord
 * progression — click a chord to jump there.
 */
export function KeySection({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const clips = useEditor((s) => s.project.clips);
  const assets = useEditor((s) => s.assets);
  const [busy, setBusy] = useState(false);
  const harmony = asset?.harmony;
  const key = clipKey(clip, asset);

  const others = useMemo(
    () =>
      clips
        .filter((c): c is AudioClip => c.kind === 'audio' && c.id !== clip.id && c.assetId !== clip.assetId)
        .map((c) => ({ clip: c, name: assets[c.assetId]?.name ?? 'Song', key: clipKey(c, assets[c.assetId]) }))
        .filter((o) => o.key)
        .filter((o, i, all) => all.findIndex((x) => x.clip.assetId === o.clip.assetId) === i),
    [clips, clip.id, clip.assetId, assets],
  );

  // The clip's part of the progression, on its own timeline position.
  const progression = useMemo(() => {
    const from = clip.inPoint;
    const to = clip.inPoint + clip.duration * clip.speed;
    return (harmony?.chords ?? []).filter((c) => c.end > from && c.start < to && c.root >= 0);
  }, [harmony, clip.inPoint, clip.duration, clip.speed]);

  const reanalyze = async () => {
    setBusy(true);
    await useEditor.getState().analyzeHarmony(clip.assetId);
    setBusy(false);
  };

  return (
    <Section title="Key & chords" icon="chord">
      {!harmony ? (
        <p className="panel-note">{asset?.status === 'ready' ? 'Reading key and chords…' : 'Waiting for the song to load…'}</p>
      ) : (
        <>
          <div className="key-card">
            <div>
              <strong>{key ? keyName(key) : 'No clear key'}</strong>
              <span>
                {key ? `${Math.round(key.confidence * 100)}% sure` : 'Mostly drums or speech'}
                {harmony.tuning !== 0 && ` · tuned ${harmony.tuning > 0 ? '+' : ''}${harmony.tuning} ct`}
                {clip.pitch !== 0 && ` · ${clip.pitch > 0 ? '+' : ''}${clip.pitch} st`}
              </span>
            </div>
            {key && <span className="camelot camelot--lg">{camelotCode(key)}</span>}
          </div>

          {key && (
            <p className="panel-note">
              Mixes with <strong>{compatibleCodes(key).slice(1).join(' · ')}</strong> — same number ±1, or the A/B swap.
            </p>
          )}

          {key && others.length > 0 && (
            <ul className="key-matches">
              {others.map((o) => {
                const match = keyCompatibility(key, o.key!);
                return (
                  <li key={o.clip.id} className={`key-match key-match--${match}`}>
                    <span className="key-match__name" title={o.name}>{o.name}</span>
                    <span className="camelot">{camelotCode(o.key!)}</span>
                    <span className="key-match__verdict">{MATCH_LABEL[match]}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {progression.length > 0 && (
            <div className="chord-strip" role="list" aria-label="Chord progression">
              {progression.slice(0, 64).map((c, i) => (
                <button
                  key={`${c.start}-${i}`}
                  type="button"
                  role="listitem"
                  className="chord-strip__chip"
                  style={{ '--chord': chordColor(c.root) } as CSSProperties}
                  title={`Jump to ${chordName(c, clip.pitch)}`}
                  onClick={() => usePlayback.getState().seek(clip.start + (Math.max(c.start, clip.inPoint) - clip.inPoint) / clip.speed)}
                >
                  {chordName(c, clip.pitch)}
                </button>
              ))}
            </div>
          )}

          <Button size="sm" variant="ghost" icon="repeat" disabled={busy} onClick={() => void reanalyze()}>
            {busy ? 'Analysing…' : asset?.stems ? 'Re-read from stems' : 'Analyse again'}
          </Button>
          {harmony.source === 'stems' && <p className="panel-note">Read from the bass + melody stems — drums and vocals don’t blur the chords.</p>}
        </>
      )}
    </Section>
  );
}
