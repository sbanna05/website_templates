import { useState, type CSSProperties, type PointerEvent } from 'react';
import { trackColor, trackIcon } from '../../config/trackColors';
import { useEditor } from '../../store/editorStore';
import { TRACK_HEIGHT_LIMITS, useUi } from '../../store/uiStore';
import type { Track } from '../../types/project';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Splitter } from '../ui/Splitter';
import { TrackMenu } from './TrackMenu';

const KIND_LABEL: Record<Track['kind'], string> = { visual: 'Video', text: 'Text', audio: 'Audio' };

/**
 * DAW-style track header: colour, drag grip, name, Mute / Solo, show-in-render,
 * focus, lock and an options menu (colour, move, delete).
 */
export function TrackHeader({ track, height, width }: { track: Track; height: number; width: number }) {
  const updateTrack = useEditor((s) => s.updateTrack);
  const focused = useUi((s) => Object.keys(s.viewHidden).length > 0 && !s.viewHidden[track.id]);
  const setTrackHeight = useUi((s) => s.setTrackHeight);
  const [menu, setMenu] = useState(false);
  const color = trackColor(track);
  const canSolo = track.kind !== 'text';

  const toggleFocus = () => {
    const { project } = useEditor.getState();
    const { viewHidden, showOnly } = useUi.getState();
    const onlyThis = project.tracks.every((t) => t.id === track.id || viewHidden[t.id]);
    showOnly(onlyThis ? [] : [track.id], project.tracks.map((t) => t.id));
  };

  return (
    <div
      className={`track-header track-header--${track.kind} ${height < 52 ? 'is-compact' : ''} ${track.solo ? 'is-solo' : ''}`}
      style={{ height, width, '--track-color': color } as CSSProperties}
    >
      <span className="track-header__strip" aria-hidden="true" />
      <TrackGrip track={track} />
      <button type="button" className="track-header__icon" title={`${KIND_LABEL[track.kind]} track — options`} onClick={() => setMenu((m) => !m)}>
        <Icon name={trackIcon(track)} size={13} />
      </button>
      <input
        className="track-header__name"
        value={track.name}
        aria-label="Track name"
        onChange={(e) => updateTrack(track.id, { name: e.target.value }, 'name')}
      />
      <IconButton icon="sliders" label="Track options — colour, move, delete" size={13} className="track-header__more" onClick={() => setMenu((m) => !m)} />

      <div className="track-header__actions">
        {canSolo && (
          <>
            <button
              type="button"
              className={`ms-btn ms-btn--mute ${track.muted ? 'is-on' : ''}`}
              aria-pressed={track.muted}
              title={track.muted ? 'Unmute track' : 'Mute track'}
              onClick={() => updateTrack(track.id, { muted: !track.muted })}
            >
              M
            </button>
            <button
              type="button"
              className={`ms-btn ms-btn--solo ${track.solo ? 'is-on' : ''}`}
              aria-pressed={Boolean(track.solo)}
              title={track.solo ? 'Un-solo' : 'Solo — hear only soloed tracks'}
              onClick={() => updateTrack(track.id, { solo: !track.solo })}
            >
              S
            </button>
          </>
        )}
        {track.kind !== 'audio' && (
          <IconButton
            icon={track.hidden ? 'eye-off' : 'eye'}
            label={track.hidden ? 'Show in video' : 'Hide from video'}
            size={13}
            active={track.hidden}
            onClick={() => updateTrack(track.id, { hidden: !track.hidden })}
          />
        )}
        <IconButton icon="target" label={focused ? 'Show all tracks' : 'Focus — show only this track'} size={13} active={focused} onClick={toggleFocus} />
        <IconButton
          icon={track.locked ? 'lock' : 'unlock'}
          label={track.locked ? 'Unlock track' : 'Lock track'}
          size={13}
          active={track.locked}
          onClick={() => updateTrack(track.id, { locked: !track.locked })}
        />
      </div>
      {menu && <TrackMenu track={track} onClose={() => setMenu(false)} />}
      <Splitter
        orientation="horizontal"
        label={`${track.name} track height`}
        className="track-header__resize"
        value={height}
        min={TRACK_HEIGHT_LIMITS.min}
        max={TRACK_HEIGHT_LIMITS.max}
        onChange={(h) => setTrackHeight(track.id, h)}
        onReset={() => setTrackHeight(track.id, null)}
      />
    </div>
  );
}

/** Drag handle: drag a header up or down to reorder tracks. */
function TrackGrip({ track }: { track: Track }) {
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const row = handle.closest<HTMLElement>('.track-row');
    row?.classList.add('is-dragging');
    let target: HTMLElement | null = null;
    let below = false;

    const clear = () => target?.classList.remove('is-drop-above', 'is-drop-below');
    const onMove = (e: globalThis.PointerEvent) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.track-row');
      clear();
      target = hit && hit !== row ? hit : null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      below = e.clientY > rect.top + rect.height / 2;
      target.classList.add(below ? 'is-drop-below' : 'is-drop-above');
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      row?.classList.remove('is-dragging');
      clear();
      const targetId = target?.dataset.trackId;
      if (!targetId) return;
      const { project, moveTrack } = useEditor.getState();
      const from = project.tracks.findIndex((t) => t.id === track.id);
      let to = project.tracks.findIndex((t) => t.id === targetId) + (below ? 1 : 0);
      if (from < to) to -= 1;
      moveTrack(track.id, to);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  return (
    <span className="track-header__grip" title="Drag to reorder" onPointerDown={onPointerDown} aria-hidden="true">
      <Icon name="grip" size={14} />
    </span>
  );
}
