import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { frameSizeFor } from '../../config/canvas';
import { clearTextLayoutCache } from '../../engine/textLayout';
import { hitTest, renderFrame } from '../../engine/renderFrame';
import { timelineBeats } from '../../engine/timeline';
import type { Hitbox } from '../../engine/types';
import { useElementSize } from '../../hooks/useElementSize';
import { PreviewFrames } from '../../media/previewFrames';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';

const MAX_DPR = 2;

interface DragState {
  clipId: string;
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
  gesture: string;
}

/**
 * The live canvas. Rendering runs in a rAF loop outside React: it reads the
 * stores directly and only draws when something changed (or while playing).
 */
export function PreviewStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitboxesRef = useRef<Hitbox[]>([]);
  const dirtyRef = useRef(true);
  const dragRef = useRef<DragState | null>(null);
  const [selectionBox, setSelectionBox] = useState<Hitbox | null>(null);

  const aspect = useEditor((s) => s.project.aspect);
  const available = useElementSize(containerRef);
  const frame = frameSizeFor(aspect, 1080);
  const fit = Math.min(available.width / frame.width, available.height / frame.height) || 0;
  const cssWidth = Math.floor(frame.width * fit);
  const cssHeight = Math.floor(frame.height * fit);
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  useEffect(() => {
    dirtyRef.current = true;
  }, [pixelWidth, pixelHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;
    const invalidate = () => {
      dirtyRef.current = true;
    };
    const frames = new PreviewFrames(invalidate);
    const unsubscribers = [
      useEditor.subscribe(invalidate),
      usePlayback.subscribe(invalidate),
    ];
    const onFontsLoaded = () => {
      clearTextLayoutCache();
      invalidate();
    };
    document.fonts.addEventListener('loadingdone', onFontsLoaded);

    let beatsCache: { project: unknown; assets: unknown; beats: number[] } | null = null;
    let raf = 0;
    let lastSelection = '';

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { project, assets, selectedClipId } = useEditor.getState();
      const { time, playing } = usePlayback.getState();
      frames.sync(project, time, playing);
      if (!dirtyRef.current && !playing) return;
      dirtyRef.current = false;

      if (beatsCache?.project !== project || beatsCache.assets !== assets) {
        beatsCache = { project, assets, beats: timelineBeats(project, assets) };
      }
      const hitboxes = renderFrame(ctx, {
        project,
        assets,
        time,
        width: canvas.width,
        height: canvas.height,
        frames,
        beats: beatsCache.beats,
      });
      hitboxesRef.current = hitboxes;

      const selected = hitboxes.find((h) => h.clipId === selectedClipId) ?? null;
      const signature = selected ? `${selected.clipId}|${selected.cx.toFixed(0)}|${selected.cy.toFixed(0)}|${selected.width.toFixed(0)}|${selected.height.toFixed(0)}|${selected.rotation.toFixed(3)}` : '';
      if (signature !== lastSelection) {
        lastSelection = signature;
        setSelectionBox(selected);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      document.fonts.removeEventListener('loadingdone', onFontsLoaded);
      frames.dispose();
    };
  }, []);

  /** Canvas pixels per CSS pixel. */
  const scale = pixelWidth / Math.max(1, cssWidth);

  const toCanvas = (event: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvas(event);
    const hit = hitTest(hitboxesRef.current, x, y);
    const { select, project } = useEditor.getState();
    select(hit?.clipId ?? null);
    const clip = project.clips.find((c) => c.id === hit?.clipId);
    if (!clip || clip.kind === 'audio') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      clipId: clip.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: clip.transform.x,
      startY: clip.transform.y,
      gesture: `move-${performance.now()}`,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.pointerX) / cssWidth;
    const dy = (event.clientY - drag.pointerY) / cssHeight;
    // Snap back to centre lines when close — handy for titles.
    const snap = (v: number) => (Math.abs(v) < 0.012 ? 0 : v);
    useEditor.getState().updateClip(
      drag.clipId,
      (clip) => (clip.kind === 'audio' ? clip : { ...clip, transform: { ...clip.transform, x: snap(drag.startX + dx), y: snap(drag.startY + dy) } }),
      drag.gesture,
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const box = selectionBox && {
    left: selectionBox.cx / scale,
    top: selectionBox.cy / scale,
    width: selectionBox.width / scale,
    height: selectionBox.height / scale,
    rotate: selectionBox.rotation,
  };

  return (
    <div className="stage" ref={containerRef}>
      <div className="stage__frame" style={{ width: cssWidth, height: cssHeight }}>
        <canvas
          ref={canvasRef}
          width={pixelWidth}
          height={pixelHeight}
          style={{ width: cssWidth, height: cssHeight }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Video preview. Click an element to select it, drag to move it."
        />
        {box && (
          <div
            className="stage__selection"
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              transform: `translate(-50%, -50%) rotate(${box.rotate}rad)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
