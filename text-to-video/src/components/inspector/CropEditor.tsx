import { useRef, useState, type PointerEvent } from 'react';
import { FULL_CROP } from '../../config/defaults';
import { cropForRatio } from '../../lib/crop';
import { clamp } from '../../lib/math';
import { useEditor } from '../../store/editorStore';
import type { Asset, Crop, VisualClip } from '../../types/project';
import { Button, IconButton } from '../ui/Button';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Gesture = { kind: 'move' } | { kind: 'resize'; corner: Corner };

interface Drag {
  gesture: Gesture;
  start: Crop;
  pointerX: number;
  pointerY: number;
  key: string;
}

/** Aspect presets; `null` = free, `'frame'` = the project's aspect ratio. */
const RATIOS: { label: string; value: string; ratio: number | null | 'frame' | 'original' }[] = [
  { label: 'Free', value: 'free', ratio: null },
  { label: 'Original', value: 'original', ratio: 'original' },
  { label: 'Frame', value: 'frame', ratio: 'frame' },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:5', value: '4:5', ratio: 4 / 5 },
  { label: '9:16', value: '9:16', ratio: 9 / 16 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
];

const MIN_SIZE = 0.06;

interface CropEditorProps {
  clip: VisualClip;
  asset: Asset;
  patch: (patch: Partial<VisualClip>, key?: string) => void;
}

export function CropEditor({ clip, asset, patch }: CropEditorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const projectAspect = useEditor((s) => s.project.aspect);
  const assetAspect = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 16 / 9;
  const frameRatio = (() => {
    const [w, h] = projectAspect.split(':').map(Number);
    return w / h;
  })();
  const { crop } = clip;
  const pixelRatio = (crop.width * assetAspect) / crop.height;

  const resolveRatio = (value: (typeof RATIOS)[number]['ratio']): number | null =>
    value === 'frame' ? frameRatio : value === 'original' ? assetAspect : value;

  // Start on whichever preset the crop already matches; after that the user's choice wins.
  const [activePreset, setActivePreset] = useState(
    () =>
      RATIOS.find((r) => {
        const ratio = resolveRatio(r.ratio);
        return ratio !== null && Math.abs(ratio - pixelRatio) < 0.01 && (r.value !== 'original' || crop.width === 1);
      })?.value ?? 'free',
  );
  const lockedRatio = activePreset === 'free' ? null : pixelRatio;

  const setCrop = (next: Crop, key?: string) => patch({ crop: next }, key);

  const onPointerDown = (event: PointerEvent<HTMLElement>, gesture: Gesture) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { gesture, start: crop, pointerX: event.clientX, pointerY: event.clientY, key: `crop-${event.timeStamp}` };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const dx = (event.clientX - drag.pointerX) / rect.width;
    const dy = (event.clientY - drag.pointerY) / rect.height;
    const s = drag.start;

    if (drag.gesture.kind === 'move') {
      setCrop({ ...s, x: clamp(s.x + dx, 0, 1 - s.width), y: clamp(s.y + dy, 0, 1 - s.height) }, drag.key);
      return;
    }

    const { corner } = drag.gesture;
    const west = corner.includes('w');
    const north = corner.includes('n');
    // The opposite corner stays put.
    const ax = west ? s.x + s.width : s.x;
    const ay = north ? s.y + s.height : s.y;
    const px = clamp((west ? s.x : s.x + s.width) + dx, 0, 1);
    const py = clamp((north ? s.y : s.y + s.height) + dy, 0, 1);
    const maxW = west ? ax : 1 - ax;
    const maxH = north ? ay : 1 - ay;
    let width = clamp(Math.abs(px - ax), MIN_SIZE, maxW);
    let height = clamp(Math.abs(py - ay), MIN_SIZE, maxH);
    if (lockedRatio) {
      const k = assetAspect / lockedRatio;
      height = width * k;
      if (height > maxH) {
        height = maxH;
        width = height / k;
      }
    }
    setCrop({ x: west ? ax - width : ax, y: north ? ay - height : ay, width, height }, drag.key);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const style = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`,
  };
  const pxW = Math.round(crop.width * asset.width);
  const pxH = Math.round(crop.height * asset.height);
  const isFull = crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1;

  return (
    <Section
      title="Crop & framing"
      icon="crop"
      aside={
        <Button size="sm" variant="ghost" disabled={isFull && !clip.flipX && !clip.flipY} onClick={() => {
            setActivePreset('original');
            patch({ crop: { ...FULL_CROP }, flipX: false, flipY: false });
          }}>
          Reset
        </Button>
      }
    >
      <div
        className="crop-editor"
        ref={boxRef}
        style={{ aspectRatio: String(assetAspect) }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {asset.thumbnail && (
          <img
            src={asset.thumbnail}
            alt=""
            draggable={false}
            style={{ transform: `scale(${clip.flipX ? -1 : 1}, ${clip.flipY ? -1 : 1})` }}
          />
        )}
        <div
          className="crop-editor__box"
          style={style}
          onPointerDown={(e) => onPointerDown(e, { kind: 'move' })}
          role="group"
          aria-label="Crop area. Drag to move, drag a corner to resize."
        >
          <span className="crop-editor__thirds" aria-hidden="true" />
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <span
              key={corner}
              className={`crop-editor__handle crop-editor__handle--${corner}`}
              onPointerDown={(e) => onPointerDown(e, { kind: 'resize', corner })}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="crop-editor__meta">
        <span>
          {pxW} × {pxH}px
        </span>
        <div className="crop-editor__flips">
          <IconButton icon="flip-h" label="Flip horizontally" active={clip.flipX} onClick={() => patch({ flipX: !clip.flipX })} />
          <IconButton icon="flip-v" label="Flip vertically" active={clip.flipY} onClick={() => patch({ flipY: !clip.flipY })} />
        </div>
      </div>

      <div className="field">
        <span className="field__label">Aspect</span>
        <div className="chip-row" role="radiogroup" aria-label="Crop aspect">
          {RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={activePreset === r.value}
              className={`chip ${activePreset === r.value ? 'is-active' : ''}`}
              onClick={() => {
                setActivePreset(r.value);
                const ratio = resolveRatio(r.ratio);
                if (r.value === 'original') setCrop({ ...FULL_CROP });
                else if (ratio !== null) setCrop(cropForRatio(crop, ratio, assetAspect));
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Segmented
        label="Fit in frame"
        value={clip.fit}
        options={[
          { label: 'Fill frame', value: 'cover' },
          { label: 'Show all', value: 'contain' },
        ]}
        onChange={(fit) => patch({ fit })}
      />
      <p className="panel-note">Drag the box to reframe, drag a corner to resize. Pick “Frame” to crop exactly to your video’s shape.</p>
    </Section>
  );
}
