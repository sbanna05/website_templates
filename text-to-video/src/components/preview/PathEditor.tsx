import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { samplePath, simplifyPath } from '../../engine/motion';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import type { MotionLayer, PathPoint, VisualClip } from '../../types/project';

interface PathEditorProps {
  width: number;
  height: number;
}

/**
 * PowerPoint-style motion path editing on top of the preview. Drag anywhere to
 * draw a new path (it always starts at the picture's resting spot); drag a dot
 * to reshape, double-click a dot to delete it. Esc or "Done" leaves.
 */
export function PathEditor({ width, height }: PathEditorProps) {
  const target = useUi((s) => s.pathEdit);
  const setPathEdit = useUi((s) => s.setPathEdit);
  const clip = useEditor((s) => s.project.clips.find((c) => c.id === target?.clipId)) as VisualClip | undefined;
  const layer = clip?.kind === 'visual' ? clip.motions.find((m) => m.id === target?.motionId) : undefined;
  const [stroke, setStroke] = useState<PathPoint[] | null>(null);
  const drag = useRef<{ index: number; key: string } | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  // Leave the editor when the move or clip goes away, or on Escape.
  useEffect(() => {
    if (target && !layer) setPathEdit(null);
  }, [target, layer, setPathEdit]);
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPathEdit(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [target, setPathEdit]);

  if (!target || !clip || clip.kind !== 'visual' || !layer) return null;

  const amount = layer.amount || 1;
  const baseX = (0.5 + clip.transform.x) * width;
  const baseY = (0.5 + clip.transform.y) * height;
  const toScreen = (p: PathPoint) => ({ x: baseX + p.x * amount * width, y: baseY + p.y * amount * height });
  const local = (e: PointerEvent) => {
    const rect = (e.currentTarget as Element).closest('svg')!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const save = (path: PathPoint[], key?: string) =>
    useEditor.getState().updateClip(
      clip.id,
      (c) => (c.kind === 'visual' ? { ...c, motions: c.motions.map((m: MotionLayer) => (m.id === layer.id ? { ...m, path } : m)) } : c),
      key,
    );

  const points = stroke ?? layer.path ?? [];
  const curve = samplePath(points).map(toScreen);
  const d = curve.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const handles = (stroke ? [] : (layer.path ?? [])).map(toScreen);

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    origin.current = local(e);
    setStroke([{ x: 0, y: 0 }]);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = local(e);
    if (drag.current && layer.path) {
      const { index, key } = drag.current;
      const next = layer.path.map((q, i) => (i === index ? { x: (p.x - baseX) / (amount * width), y: (p.y - baseY) / (amount * height) } : q));
      save(next, key);
      return;
    }
    if (!stroke || !origin.current) return;
    const o = origin.current;
    const point = { x: (p.x - o.x) / (amount * width), y: (p.y - o.y) / (amount * height) };
    const last = stroke[stroke.length - 1];
    if (Math.hypot((point.x - last.x) * width, (point.y - last.y) * height) > 3) setStroke([...stroke, point]);
  };
  const onUp = () => {
    if (drag.current) {
      drag.current = null;
      return;
    }
    if (stroke && stroke.length > 1) save(simplifyPath(stroke));
    setStroke(null);
    origin.current = null;
  };

  const start = curve[0] ?? { x: baseX, y: baseY };
  const end = curve[curve.length - 1];

  return (
    <div className="path-editor">
      <svg
        className="path-editor__canvas"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="application"
        aria-label="Motion path editor. Drag to draw a path for the picture."
      >
        <circle cx={baseX} cy={baseY} r={5} className="path-editor__rest" />
        {d && <path d={d} className="path-editor__line" />}
        {handles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === 0 ? 6 : 5}
            className={`path-editor__handle ${i === 0 ? 'is-start' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
              drag.current = { index: i, key: `path.${layer.id}.${e.timeStamp}` };
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (layer.path && layer.path.length > 2) save(layer.path.filter((_, j) => j !== i));
            }}
          />
        ))}
        {end && curve.length > 1 && (
          <path
            className="path-editor__arrow"
            d={`M${end.x} ${end.y} m-6 -6 l6 6 l-6 6`}
            transform={`rotate(${(Math.atan2(end.y - curve[curve.length - 2].y, end.x - curve[curve.length - 2].x) * 180) / Math.PI} ${end.x} ${end.y})`}
          />
        )}
        {!d && (
          <text x={start.x} y={start.y - 14} className="path-editor__hint" textAnchor="middle">
            Drag to draw the path
          </text>
        )}
      </svg>
      <div className="path-editor__bar">
        <span>Drawing a motion path</span>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setPathEdit(null)}>
          <span>Done</span>
        </button>
      </div>
    </div>
  );
}
