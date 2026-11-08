import { useEffect, useState, type CSSProperties } from 'react';
import { FULL_STEM_MIX, STEMS, STEM_PRESETS, STEM_VOLUME_MAX, matchesPreset, presetMix } from '../../engine/stems';
import { STEM_MODEL } from '../../stems/protocol';
import { useEditor } from '../../store/editorStore';
import { useStems, type StemJob } from '../../store/stemsStore';
import type { AudioClip, StemChannel, StemName } from '../../types/project';
import { Waveform } from '../timeline/Waveform';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { useClipPatch } from './useClipPatch';

const pct = (v: number) => `${Math.round(v * 100)}%`;

function jobStatus(job: StemJob, now: number): { label: string; progress: number | null } {
  switch (job.stage) {
    case 'preparing':
      return { label: 'Preparing audio…', progress: null };
    case 'download':
      return { label: `Downloading the stem model… ${Math.round(job.progress * 100)}% of ${STEM_MODEL.sizeMb} MB`, progress: job.progress };
    case 'loading':
      return { label: `Starting the model on the ${job.device === 'webgpu' ? 'GPU' : 'CPU'}…`, progress: null };
    case 'separating': {
      const elapsed = job.separatingSince ? (now - job.separatingSince) / 1000 : 0;
      const remaining = job.progress > 0.04 ? (elapsed / job.progress) * (1 - job.progress) : null;
      const eta = remaining === null ? '' : remaining > 90 ? ` · ~${Math.ceil(remaining / 60)} min left` : ` · ~${Math.ceil(remaining)} s left`;
      return { label: `Separating… ${Math.round(job.progress * 100)}%${eta}`, progress: job.progress };
    }
  }
}

/**
 * AI stem separation and the per-clip stem mixer: split once, then blend
 * vocals / drums / bass / melody per clip — or put each stem on its own track.
 */
export function StemsSection({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const stemAssets = useEditor((s) => s.assets);
  const extractStems = useEditor((s) => s.extractStems);
  const job = useStems((s) => s.jobs[clip.assetId]);
  const busy = useStems((s) => Object.keys(s.jobs).length > 0);
  const { split, cancel } = useStems.getState();
  const patch = useClipPatch(clip);
  const [now, setNow] = useState(() => performance.now());

  // Tick once a second while separating, for the time estimate.
  useEffect(() => {
    if (job?.stage !== 'separating') return;
    const timer = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, [job?.stage]);

  if (!asset) return null;
  if (asset.stemOf) {
    return (
      <Section title="Stems" icon="layers" defaultOpen={false}>
        <p className="panel-note">This is the {STEMS.find((s) => s.id === asset.stemOf?.stem)?.label.toLowerCase()} stem of another song.</p>
      </Section>
    );
  }

  const mix = clip.stems ?? FULL_STEM_MIX;
  const setChannel = (name: StemName, next: Partial<StemChannel>, key?: string) =>
    patch((c) => ({ stems: { ...(c.stems ?? FULL_STEM_MIX), [name]: { ...(c.stems ?? FULL_STEM_MIX)[name], ...next } } }), key);
  const status = job ? jobStatus(job, now) : null;
  const span = { from: clip.inPoint, to: clip.inPoint + clip.duration * clip.speed };

  return (
    <Section title="Stems" icon="layers">
      {!asset.stems ? (
        <>
          <p className="panel-note">
            Split the song with AI into <strong>vocals, drums, bass and melody</strong> — then mute, solo or blend them per clip,
            or give each its own track. Runs on your device; the {STEM_MODEL.sizeMb} MB model downloads once.
          </p>
          {status ? (
            <div className="lyric-progress" role="status" aria-live="polite">
              <div className="progress">
                <div
                  className={`progress__bar ${status.progress === null ? 'is-indeterminate' : ''}`}
                  style={status.progress === null ? undefined : { width: `${status.progress * 100}%` }}
                />
              </div>
              <span>{status.label}</span>
              <Button size="sm" variant="ghost" icon="close" onClick={() => cancel(clip.assetId)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="primary" icon="layers" disabled={busy} onClick={() => void split(clip.assetId)}>
              Split into stems
            </Button>
          )}
          <p className="panel-note panel-note--faint">A 3-minute song takes about a minute on a recent GPU, several minutes on CPU.</p>
        </>
      ) : (
        <>
          <div className="chip-row" role="group" aria-label="Stem presets">
            {STEM_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.hint}
                className={`chip ${matchesPreset(clip.stems, preset) ? 'is-active' : ''}`}
                onClick={() => patch({ stems: presetMix(preset) })}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="stem-mixer" role="group" aria-label="Stem mixer">
            {STEMS.map((stem) => {
              const channel = mix[stem.id];
              const stemAsset = stemAssets[asset.stems?.[stem.id] ?? ''];
              const pps = stemAsset?.waveform && stemAsset.duration > 0 ? stemAsset.waveform.length / stemAsset.duration : 0;
              const audible = channel.solo || (!channel.muted && !STEMS.some((s) => mix[s.id].solo));
              return (
                <div key={stem.id} className={`stem-row ${audible ? '' : 'is-off'}`} style={{ '--stem': stem.color } as CSSProperties}>
                  <span className="stem-row__name">{stem.label}</span>
                  <div className="stem-row__wave" aria-hidden="true">
                    {stemAsset?.waveform && pps > 0 && <Waveform peaks={stemAsset.waveform} from={span.from * pps} to={span.to * pps} />}
                  </div>
                  <div className="stem-row__buttons">
                    <button
                      type="button"
                      className={`stem-btn ${channel.muted ? 'is-active' : ''}`}
                      aria-pressed={channel.muted}
                      aria-label={`Mute ${stem.label}`}
                      title={`Mute ${stem.label}`}
                      onClick={() => setChannel(stem.id, { muted: !channel.muted })}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`stem-btn stem-btn--solo ${channel.solo ? 'is-active' : ''}`}
                      aria-pressed={channel.solo}
                      aria-label={`Solo ${stem.label}`}
                      title={`Solo ${stem.label}`}
                      onClick={() => setChannel(stem.id, { solo: !channel.solo })}
                    >
                      S
                    </button>
                  </div>
                  <input
                    className="stem-row__fader"
                    type="range"
                    min={0}
                    max={STEM_VOLUME_MAX}
                    step={0.01}
                    value={channel.volume}
                    aria-label={`${stem.label} volume`}
                    aria-valuetext={pct(channel.volume)}
                    style={{ '--fill': `${(channel.volume / STEM_VOLUME_MAX) * 100}%` } as CSSProperties}
                    onChange={(e) => setChannel(stem.id, { volume: Number(e.target.value) }, `stem-${stem.id}`)}
                    onDoubleClick={() => setChannel(stem.id, { volume: 1 })}
                  />
                  <output className="stem-row__value">{pct(channel.volume)}</output>
                </div>
              );
            })}
          </div>

          <Button icon="layers" onClick={() => extractStems(clip.id)} title="Replace this clip with one clip per stem, each on its own track">
            Put stems on separate tracks
          </Button>
          <p className="panel-note panel-note--faint">
            Separated with {STEM_MODEL.label}. The stems also appear in the Music library to drag anywhere.
          </p>
        </>
      )}
    </Section>
  );
}
