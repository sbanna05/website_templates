import { useEditor } from '../../store/editorStore';
import type { Track } from '../../types/project';
import { IconButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';

const KIND_ICON: Record<Track['kind'], IconName> = { visual: 'film', text: 'text', audio: 'music' };

export function TrackHeader({ track, height }: { track: Track; height: number }) {
  const updateTrack = useEditor((s) => s.updateTrack);
  const removeTrack = useEditor((s) => s.removeTrack);

  return (
    <div className={`track-header track-header--${track.kind}`} style={{ height }}>
      <span className="track-header__icon">
        <Icon name={KIND_ICON[track.kind]} size={14} />
      </span>
      <input
        className="track-header__name"
        value={track.name}
        aria-label="Track name"
        onChange={(e) => updateTrack(track.id, { name: e.target.value }, 'name')}
      />
      <div className="track-header__actions">
        {track.kind !== 'audio' && (
          <IconButton
            icon={track.hidden ? 'eye-off' : 'eye'}
            label={track.hidden ? 'Show track' : 'Hide track'}
            size={14}
            active={track.hidden}
            onClick={() => updateTrack(track.id, { hidden: !track.hidden })}
          />
        )}
        {track.kind !== 'text' && (
          <IconButton
            icon={track.muted ? 'volume-off' : 'volume'}
            label={track.muted ? 'Unmute track' : 'Mute track'}
            size={14}
            active={track.muted}
            onClick={() => updateTrack(track.id, { muted: !track.muted })}
          />
        )}
        <IconButton
          icon={track.locked ? 'lock' : 'unlock'}
          label={track.locked ? 'Unlock track' : 'Lock track'}
          size={14}
          active={track.locked}
          onClick={() => updateTrack(track.id, { locked: !track.locked })}
        />
        <IconButton icon="trash" label="Delete track" size={14} onClick={() => removeTrack(track.id)} />
      </div>
    </div>
  );
}
