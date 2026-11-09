import { useEffect, useRef } from 'react';
import { TRACK_COLORS, trackColor } from '../../config/trackColors';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import type { Track } from '../../types/project';
import { Icon } from '../ui/Icon';

interface TrackMenuProps {
  track: Track;
  onClose: () => void;
}

/** Track options: colour, focus, move, delete. Closes on outside click or Esc. */
export function TrackMenu({ track, onClose }: TrackMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { updateTrack, removeTrack, moveTrack } = useEditor.getState();
  const tracks = useEditor((s) => s.project.tracks);
  const index = tracks.findIndex((t) => t.id === track.id);
  const current = trackColor(track).toLowerCase();

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const focus = () => {
    useUi.getState().showOnly([track.id], tracks.map((t) => t.id));
    onClose();
  };

  return (
    <div className="track-menu" ref={ref} role="dialog" aria-label={`${track.name} track options`}>
      <p className="track-menu__title">Track colour</p>
      <div className="track-menu__swatches" role="radiogroup" aria-label="Track colour">
        {TRACK_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={current === c.value}
            aria-label={c.name}
            title={c.name}
            className={`track-menu__swatch ${current === c.value ? 'is-active' : ''}`}
            style={{ background: c.value }}
            onClick={() => updateTrack(track.id, { color: c.value })}
          />
        ))}
        <label className="track-menu__swatch track-menu__swatch--custom" title="Custom colour">
          <span className="sr-only">Custom colour</span>
          <input type="color" value={trackColor(track)} onChange={(e) => updateTrack(track.id, { color: e.target.value }, 'color')} />
        </label>
      </div>
      {track.color && (
        <button type="button" className="track-menu__item" onClick={() => updateTrack(track.id, { color: undefined })}>
          <Icon name="undo" size={14} /> Default colour
        </button>
      )}
      <hr />
      <button type="button" className="track-menu__item" onClick={focus}>
        <Icon name="target" size={14} /> Show only this track
      </button>
      <button type="button" className="track-menu__item" disabled={index <= 0} onClick={() => moveTrack(track.id, index - 1)}>
        <Icon name="chevron" size={14} className="rotate-180" /> Move up
      </button>
      <button type="button" className="track-menu__item" disabled={index >= tracks.length - 1} onClick={() => moveTrack(track.id, index + 1)}>
        <Icon name="chevron" size={14} /> Move down
      </button>
      <hr />
      <button
        type="button"
        className="track-menu__item track-menu__item--danger"
        onClick={() => {
          removeTrack(track.id);
          onClose();
        }}
      >
        <Icon name="trash" size={14} /> Delete track
      </button>
    </div>
  );
}
