import { gsap } from 'gsap';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { frameSizeFor } from '../../config/canvas';
import { projectDuration } from '../../engine/timeline';
import {
  EXPORT_FORMATS,
  EXPORT_SAMPLE_RATE,
  KIND_LABEL,
  isLosslessAudio,
  type AudioExportSettings,
  type ExportFormatInfo,
  type ExportKind,
  type ExportPhase,
  type ExportProgress,
  type ExportRequest,
  type GifExportSettings,
  type StillExportSettings,
  type VideoExportSettings,
} from '../../export/formats';
import { downloadBlob, sanitizeFilename } from '../../lib/download';
import { formatBytes, formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { useUi } from '../../store/uiStore';
import type { Project } from '../../types/project';
import { Button, IconButton } from '../ui/Button';
import type { IconName } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { AudioOptions, GifOptions, StillOptions, VideoOptions } from './ExportOptions';

type Status =
  | { kind: 'idle' }
  | { kind: 'running'; progress: ExportProgress }
  | { kind: 'done'; blob: Blob; url: string; seconds: number; format: ExportFormatInfo; filename: string }
  | { kind: 'error'; message: string };

interface ExportPrefs {
  kind: ExportKind;
  video: VideoExportSettings;
  gif: GifExportSettings;
  audio: AudioExportSettings;
  still: StillExportSettings;
}

const DEFAULT_PREFS: ExportPrefs = {
  kind: 'video',
  video: { format: 'mp4', shortSide: 1080, fps: 30, quality: 'high' },
  gif: { shortSide: 480, fps: 15, dither: false },
  audio: { format: 'wav', bitDepth: 24, bitrateKbps: 320 },
  still: { shortSide: 1080 },
};

const KIND_ICON: Record<ExportKind, IconName> = { video: 'film', animation: 'repeat', audio: 'music', image: 'image' };
const KIND_OPTIONS = (Object.keys(KIND_LABEL) as ExportKind[]).map((kind) => ({ label: KIND_LABEL[kind], value: kind }));

/** GIFs past this length get large and slow; nudge towards a video format. */
const LONG_GIF_SECONDS = 20;

function buildRequest(prefs: ExportPrefs, playhead: number): ExportRequest {
  switch (prefs.kind) {
    case 'video':
      return { kind: 'video', ...prefs.video };
    case 'animation':
      return { kind: 'animation', format: 'gif', ...prefs.gif };
    case 'audio':
      return { kind: 'audio', ...prefs.audio };
    case 'image':
      return { kind: 'image', format: 'png', time: playhead, ...prefs.still };
  }
}

/** Header line, e.g. "1080×1920 · 30 fps · 0:42.0 · MP4". */
function describe(request: ExportRequest, project: Project): string {
  const label = EXPORT_FORMATS[request.format].label;
  const duration = formatTimecode(projectDuration(project));
  const size = (shortSide: number) => {
    const { width, height } = frameSizeFor(project.aspect, shortSide);
    return `${width}×${height}`;
  };
  switch (request.kind) {
    case 'video':
      return `${size(request.shortSide)} · ${request.fps} fps · ${duration} · ${label}`;
    case 'animation':
      return `${size(request.shortSide)} · ${request.fps} fps · ${duration} · loop · ${label}`;
    case 'audio': {
      const detail = isLosslessAudio(request.format) ? `${request.bitDepth}-bit` : `${request.bitrateKbps} kbps`;
      return `${EXPORT_SAMPLE_RATE / 1000} kHz stereo · ${detail} · ${duration} · ${label}`;
    }
    case 'image':
      return `${size(request.shortSide)} · frame at ${formatTimecode(request.time)} · ${label}`;
  }
}

function phaseLabel(phase: ExportPhase, format: ExportFormatInfo): string {
  switch (phase) {
    case 'preparing':
      return 'Preparing fonts & codecs';
    case 'audio':
      return 'Mixing audio';
    case 'video':
      return 'Rendering frames';
    case 'encoding':
      return `Encoding ${format.label}`;
    case 'finalizing':
      return `Writing ${format.label}`;
  }
}

function filenameFor(project: Project, request: ExportRequest): string {
  const base = sanitizeFilename(project.name);
  const suffix = request.kind === 'image' ? `-${formatTimecode(request.time).replace(/[^\d]+/g, '-')}` : '';
  return `${base}${suffix}.${EXPORT_FORMATS[request.format].extension}`;
}

/** Async per-format capability check; `null` reason means supported. */
function useExportSupport(kind: ExportKind, audio: AudioExportSettings): { checking: boolean; reason: string | null } {
  const { format, bitDepth, bitrateKbps } = audio;
  const key = kind === 'audio' ? `audio:${format}:${bitDepth}:${bitrateKbps}` : kind;
  const [result, setResult] = useState<{ key: string; reason: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    import('../../export/runExport')
      .then(({ checkExportSupport }) => checkExportSupport(kind, { format, bitDepth, bitrateKbps }))
      .catch((error: unknown) => (error instanceof Error ? error.message : String(error)))
      .then((reason) => {
        if (live) setResult({ key, reason });
      });
    return () => {
      live = false;
    };
  }, [key, kind, format, bitDepth, bitrateKbps]);

  return result?.key === key ? { checking: false, reason: result.reason } : { checking: true, reason: null };
}

/** Runs one export against the latest editor state and measures how long it took. */
async function performExport(request: ExportRequest, onProgress: (progress: ExportProgress) => void, signal: AbortSignal) {
  const began = performance.now();
  const { project, assets } = useEditor.getState();
  const { runExport } = await import('../../export/runExport');
  const blob = await runExport(request, project, assets, onProgress, signal);
  return { blob, seconds: (performance.now() - began) / 1000, filename: filenameFor(project, request) };
}

export function ExportDialog() {
  const open = useUi((s) => s.exportOpen);
  return open ? <ExportDialogContent /> : null;
}

function ExportDialogContent() {
  const setOpen = useUi((s) => s.setExportOpen);
  const project = useEditor((s) => s.project);
  const playhead = usePlayback((s) => s.time);
  const [prefs, setPrefs] = useState<ExportPrefs>(DEFAULT_PREFS);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const request = buildRequest(prefs, playhead);
  const format = EXPORT_FORMATS[request.format];
  const support = useExportSupport(prefs.kind, prefs.audio);
  const running = status.kind === 'running';
  const longGif = request.kind === 'animation' && projectDuration(project) > LONG_GIF_SECONDS;

  useLayoutEffect(() => {
    if (!dialogRef.current) return;
    usePlayback.getState().pause();
    const tween = gsap.fromTo(
      dialogRef.current,
      { y: 24, scale: 0.96, autoAlpha: 0 },
      { y: 0, scale: 1, autoAlpha: 1, duration: 0.45, ease: 'expo.out' },
    );
    return () => {
      tween.kill();
    };
  }, []);

  // Abort a running export if the dialog unmounts (e.g. project closed).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Revoke the result URL when it's replaced or the dialog unmounts.
  useEffect(() => () => {
    if (status.kind === 'done') URL.revokeObjectURL(status.url);
  }, [status]);

  const patch = <K extends Exclude<keyof ExportPrefs, 'kind'>>(key: K) => (change: Partial<ExportPrefs[K]>) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], ...change } }));

  // Closing unmounts the content, which aborts any running export and resets state.
  const close = () => setOpen(false);

  const start = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const snapshot = request;
    setStatus({ kind: 'running', progress: { phase: 'preparing', progress: 0 } });
    try {
      const onProgress = (progress: ExportProgress) => {
        if (!controller.signal.aborted) setStatus({ kind: 'running', progress });
      };
      const { blob, seconds, filename } = await performExport(snapshot, onProgress, controller.signal);
      if (controller.signal.aborted) return;
      setStatus({ kind: 'done', blob, url: URL.createObjectURL(blob), seconds, format: EXPORT_FORMATS[snapshot.format], filename });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) setStatus({ kind: 'idle' });
      else setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !running && close()}>
      <div className="dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="export-title">
        <header className="dialog__header">
          <div>
            <h2 id="export-title">Export</h2>
            <p>{describe(request, project)}</p>
          </div>
          <IconButton icon="close" label="Close" onClick={close} />
        </header>

        {(status.kind === 'idle' || status.kind === 'error') && (
          <div className="dialog__body">
            <Segmented label="Export as" value={prefs.kind} options={KIND_OPTIONS} onChange={(kind) => setPrefs((p) => ({ ...p, kind }))} />
            {prefs.kind === 'video' && <VideoOptions value={prefs.video} onChange={patch('video')} />}
            {prefs.kind === 'animation' && <GifOptions value={prefs.gif} onChange={patch('gif')} />}
            {prefs.kind === 'audio' && <AudioOptions value={prefs.audio} onChange={patch('audio')} />}
            {prefs.kind === 'image' && <StillOptions value={prefs.still} onChange={patch('still')} />}
            <p className="panel-note">{format.hint}</p>
            {longGif && (
              <p className="panel-note">
                This timeline is over {LONG_GIF_SECONDS}s — the GIF will be large. WebM or MP4 keeps the quality at a fraction of the size.
              </p>
            )}
            {support.reason && <p className="dialog__error">{support.reason}</p>}
            {status.kind === 'error' && <p className="dialog__error">{status.message}</p>}
            <Button
              variant="primary"
              icon={KIND_ICON[prefs.kind]}
              onClick={start}
              disabled={support.checking || support.reason !== null}
              className="dialog__cta"
            >
              {request.kind === 'image' ? `Save ${format.label}` : `Render ${format.label}`}
            </Button>
            <p className="panel-note">Rendering happens entirely on your device — nothing is uploaded.</p>
          </div>
        )}

        {status.kind === 'running' && (
          <div className="dialog__body">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.progress.progress * 100)}>
              <div className="progress__bar" style={{ transform: `scaleX(${status.progress.progress})` }} />
            </div>
            <div className="progress__meta">
              <span>{phaseLabel(status.progress.phase, format)}…</span>
              <strong>{Math.round(status.progress.progress * 100)}%</strong>
            </div>
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          </div>
        )}

        {status.kind === 'done' && (
          <div className="dialog__body">
            <ExportPreview format={status.format} url={status.url} />
            <p className="panel-note">
              {formatBytes(status.blob.size)} · rendered in {status.seconds.toFixed(1)}s
            </p>
            <div className="dialog__actions">
              <Button variant="ghost" onClick={() => setStatus({ kind: 'idle' })}>
                Change settings
              </Button>
              <Button variant="primary" icon="download" onClick={() => downloadBlob(status.blob, status.filename)}>
                Download {status.format.label}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportPreview({ format, url }: { format: ExportFormatInfo; url: string }) {
  switch (format.kind) {
    case 'video':
      return <video className="dialog__video" src={url} controls playsInline />;
    case 'audio':
      return <audio className="dialog__audio" src={url} controls />;
    case 'animation':
    case 'image':
      return <img className="dialog__video dialog__image" src={url} alt={`${format.label} export preview`} />;
  }
}
