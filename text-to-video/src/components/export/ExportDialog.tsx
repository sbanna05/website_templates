import { gsap } from 'gsap';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { frameSizeFor } from '../../config/canvas';
import { projectDuration } from '../../engine/timeline';
import type { ExportProgress, ExportSettings } from '../../export/exportVideo';
import { downloadBlob, sanitizeFilename } from '../../lib/download';
import { formatBytes, formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { useUi } from '../../store/uiStore';
import { Button, IconButton } from '../ui/Button';
import { Segmented } from '../ui/Segmented';

type Status =
  | { kind: 'idle' }
  | { kind: 'running'; progress: ExportProgress }
  | { kind: 'done'; blob: Blob; url: string; seconds: number }
  | { kind: 'error'; message: string };

// The encoder stack (Mediabunny) is loaded on demand to keep the editor bundle lean.
const isExportSupported = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

const PHASE_LABEL: Record<ExportProgress['phase'], string> = {
  preparing: 'Preparing fonts & codecs',
  audio: 'Mixing audio',
  video: 'Rendering frames',
  finalizing: 'Writing MP4',
};

export function ExportDialog() {
  const open = useUi((s) => s.exportOpen);
  const setOpen = useUi((s) => s.setExportOpen);
  const project = useEditor((s) => s.project);
  const [settings, setSettings] = useState<ExportSettings>({ shortSide: 1080, fps: 30, quality: 'high' });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const size = frameSizeFor(project.aspect, settings.shortSide);
  const duration = projectDuration(project);
  const running = status.kind === 'running';

  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    usePlayback.getState().pause();
    const tween = gsap.fromTo(
      dialogRef.current,
      { y: 24, scale: 0.96, autoAlpha: 0 },
      { y: 0, scale: 1, autoAlpha: 1, duration: 0.45, ease: 'expo.out' },
    );
    return () => {
      tween.kill();
    };
  }, [open]);

  // Revoke the result URL when it's replaced or the dialog unmounts.
  useEffect(() => () => {
    if (status.kind === 'done') URL.revokeObjectURL(status.url);
  }, [status]);

  if (!open) return null;

  const close = () => {
    abortRef.current?.abort();
    setStatus({ kind: 'idle' });
    setOpen(false);
  };

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const began = performance.now();
    setStatus({ kind: 'running', progress: { phase: 'preparing', progress: 0 } });
    try {
      const { project: latest, assets } = useEditor.getState();
      const { exportVideo } = await import('../../export/exportVideo');
      const blob = await exportVideo(latest, assets, settings, (progress) => setStatus({ kind: 'running', progress }), controller.signal);
      setStatus({ kind: 'done', blob, url: URL.createObjectURL(blob), seconds: (performance.now() - began) / 1000 });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setStatus({ kind: 'idle' });
      else setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !running && close()}>
      <div className="dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="export-title">
        <header className="dialog__header">
          <div>
            <h2 id="export-title">Export video</h2>
            <p>
              {size.width}×{size.height} · {settings.fps} fps · {formatTimecode(duration)} · MP4
            </p>
          </div>
          <IconButton icon="close" label="Close" onClick={close} />
        </header>

        {!isExportSupported() && (
          <p className="dialog__error">Your browser doesn't support WebCodecs, which in-browser MP4 export needs. Try a recent Chrome, Edge or Safari.</p>
        )}

        {(status.kind === 'idle' || status.kind === 'error') && (
          <div className="dialog__body">
            <Segmented
              label="Resolution"
              value={settings.shortSide}
              options={[
                { label: '720p', value: 720 },
                { label: '1080p', value: 1080 },
                { label: '1440p', value: 1440 },
              ]}
              onChange={(shortSide) => setSettings((s) => ({ ...s, shortSide }))}
            />
            <Segmented
              label="Frame rate"
              value={settings.fps}
              options={[
                { label: '24', value: 24 },
                { label: '30', value: 30 },
                { label: '60', value: 60 },
              ]}
              onChange={(fps) => setSettings((s) => ({ ...s, fps }))}
            />
            <Segmented
              label="Quality"
              value={settings.quality}
              options={[
                { label: 'Smaller file', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Max', value: 'very-high' },
              ]}
              onChange={(quality) => setSettings((s) => ({ ...s, quality }))}
            />
            {status.kind === 'error' && <p className="dialog__error">{status.message}</p>}
            <Button variant="primary" icon="film" onClick={start} disabled={!isExportSupported()} className="dialog__cta">
              Render MP4
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
              <span>{PHASE_LABEL[status.progress.phase]}…</span>
              <strong>{Math.round(status.progress.progress * 100)}%</strong>
            </div>
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          </div>
        )}

        {status.kind === 'done' && (
          <div className="dialog__body">
            <video className="dialog__video" src={status.url} controls playsInline />
            <p className="panel-note">
              {formatBytes(status.blob.size)} · rendered in {status.seconds.toFixed(1)}s
            </p>
            <div className="dialog__actions">
              <Button variant="ghost" onClick={() => setStatus({ kind: 'idle' })}>
                Change settings
              </Button>
              <Button variant="primary" icon="download" onClick={() => downloadBlob(status.blob, `${sanitizeFilename(project.name)}.mp4`)}>
                Download MP4
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
