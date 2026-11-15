import { useState } from 'react';
import { TEXT_PRESETS } from '../../config/presets';
import { cleanWords, type CaptionMode } from '../../engine/captions';
import { LYRIC_MODELS, type LyricModel } from '../../lyrics/protocol';
import { formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { useLyrics } from '../../store/lyricsStore';
import { usePlayback } from '../../store/playbackStore';
import type { MediaClip } from '../../types/project';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';

const LANGUAGES = [
  { label: 'Detect automatically', value: 'auto' },
  { label: 'English', value: 'en' },
  { label: 'Hungarian', value: 'hu' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Polish', value: 'pl' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
] as const;

const MODEL_OPTIONS = (Object.keys(LYRIC_MODELS) as LyricModel[]).map((value) => ({
  value,
  label: LYRIC_MODELS[value].label,
  title: `${LYRIC_MODELS[value].size}, downloaded once`,
}));

const CAPTION_MODES: { label: string; value: CaptionMode; title: string }[] = [
  { label: 'Phrases', value: 'phrases', title: 'A few words per caption, revealed as they are sung' },
  { label: 'Word by word', value: 'words', title: 'One punchy word at a time (TikTok style)' },
  { label: 'Karaoke', value: 'karaoke', title: 'Whole line, words light up as they are sung' },
];

const STYLE_OPTIONS = TEXT_PRESETS.filter((p) => p.id !== 'karaoke').map((p) => ({ label: p.name, value: p.id }));

/**
 * TikTok-style auto captions: speech recognition (Whisper, in the browser)
 * finds each word and when it is sung; the words become timed text clips.
 */
export function LyricsSection({ clip }: { clip: MediaClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const addCaptions = useEditor((s) => s.addCaptions);
  const job = useLyrics((s) => s.jobs[clip.assetId]);
  const detect = useLyrics((s) => s.detect);

  const [model, setModel] = useState<LyricModel>('fast');
  const [language, setLanguage] = useState<string>('auto');
  const [vocalFocus, setVocalFocus] = useState(clip.kind === 'audio');
  const [mode, setMode] = useState<CaptionMode>('phrases');
  const [presetId, setPresetId] = useState('caption');
  const [snapToBeats, setSnapToBeats] = useState(false);

  if (!asset || (clip.kind === 'visual' && !asset.hasAudio)) return null;
  const words = cleanWords(asset.lyrics?.words ?? []);
  const clipFrom = clip.inPoint;
  const clipTo = clip.inPoint + clip.duration * clip.speed;
  const covered = asset.lyrics && asset.lyrics.from <= clipFrom + 0.05 && asset.lyrics.to >= clipTo - 0.05;
  const inClip = words.filter((w) => w.start >= clipFrom && w.start < clipTo);
  const toTimeline = (s: number) => clip.start + (s - clip.inPoint) / clip.speed;

  const status =
    job?.stage === 'download'
      ? job.progress >= 99.5
        ? 'Starting speech model…'
        : `Downloading speech model… ${Math.round(job.progress)}%`
      : job?.stage === 'transcribing'
        ? 'Listening for words…'
        : job
          ? 'Preparing audio…'
          : null;

  return (
    <Section title="Auto lyrics" icon="mic" defaultOpen={Boolean(asset.lyrics)}>
      {!asset.lyrics || !covered ? (
        <>
          <Segmented label="Model" value={model} options={MODEL_OPTIONS} onChange={setModel} />
          <Select label="Language" value={language} options={LANGUAGES} onChange={setLanguage} />
          {asset.stems ? (
            <p className="panel-note">Listening to the separated vocal stem — the cleanest input for word detection.</p>
          ) : (
            <Toggle label="Vocal focus" hint="Filters out the beat first — helps with music. Splitting stems works even better." checked={vocalFocus} onChange={setVocalFocus} />
          )}
          {status ? (
            <div className="lyric-progress" role="status" aria-live="polite">
              <div className="progress">
                <div
                  className={`progress__bar ${job?.stage === 'download' ? '' : 'is-indeterminate'}`}
                  style={job?.stage === 'download' ? { width: `${job.progress}%` } : undefined}
                />
              </div>
              <span>{status}</span>
            </div>
          ) : (
            <Button variant="primary" icon="mic" onClick={() => void detect(clip, { model, language, vocalFocus })}>
              Detect words
            </Button>
          )}
          <p className="panel-note">
            Runs entirely in your browser — nothing is uploaded. The first run downloads the speech model ({LYRIC_MODELS[model].size}) once.
            Clear vocals work best; heavy beats or fast rap can miss words.
          </p>
        </>
      ) : (
        <>
          <div className="lyric-words" aria-label="Detected words — click one to jump to it">
            {inClip.length === 0 && <span className="panel-note">No words in this part of the clip.</span>}
            {inClip.map((w, i) => (
              <button
                key={`${w.start}-${i}`}
                type="button"
                className="lyric-word"
                title={formatTimecode(toTimeline(w.start))}
                onClick={() => usePlayback.getState().seek(toTimeline(w.start))}
              >
                {w.text}
              </button>
            ))}
          </div>
          <Segmented label="Captions" value={mode} options={CAPTION_MODES} onChange={setMode} />
          {mode !== 'karaoke' && <Select label="Style" value={presetId} options={STYLE_OPTIONS} onChange={setPresetId} />}
          <Toggle label="Snap captions to the beat" hint="Nudges each caption onto the nearest beat (±0.15 s)" checked={snapToBeats} onChange={setSnapToBeats} />
          <div className="button-row">
            <Button variant="primary" icon="text" disabled={inClip.length === 0} onClick={() => addCaptions(clip.id, { mode, presetId, snapToBeats })}>
              Add {inClip.length} words as captions
            </Button>
            <Button
              variant="ghost"
              icon="repeat"
              title="Detect again (e.g. with the other model)"
              onClick={() => useEditor.getState().updateAsset(clip.assetId, { lyrics: undefined })}
            >
              Redo
            </Button>
          </div>
          <p className="panel-note">Captions land on a new “Lyrics” track; edit any of them like normal text. Click a word to jump to it.</p>
        </>
      )}
    </Section>
  );
}
