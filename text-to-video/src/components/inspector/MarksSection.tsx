import { MARKER_COLORS } from '../../config/defaults';
import { formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { Button, IconButton } from '../ui/Button';
import { Section } from '../ui/Section';

/** TikTok-style marks: named points you can jump to, snap to and cut on. */
export function MarksSection() {
  const markers = useEditor((s) => s.project.markers);
  const { addMarker, updateMarker, removeMarker, clearMarkers } = useEditor.getState();
  const seek = usePlayback((s) => s.seek);

  return (
    <Section
      title="Marks"
      icon="flag"
      aside={
        markers.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearMarkers}>
            Clear
          </Button>
        )
      }
    >
      <Button size="sm" icon="flag" onClick={() => addMarker(usePlayback.getState().time)}>
        Mark at playhead
      </Button>
      {markers.length === 0 ? (
        <p className="panel-note">
          Press <kbd>M</kbd> while playing to drop marks on the moments that matter. Clips snap to them, and “Sync” can cut on
          them instead of the beat.
        </p>
      ) : (
        <ul className="mark-list">
          {markers.map((marker) => (
            <li key={marker.id} className="mark-row">
              <button
                type="button"
                className="mark-row__color"
                style={{ background: marker.color }}
                aria-label={`Change colour of ${marker.label}`}
                onClick={() => {
                  const next = MARKER_COLORS[(MARKER_COLORS.indexOf(marker.color as (typeof MARKER_COLORS)[number]) + 1) % MARKER_COLORS.length];
                  updateMarker(marker.id, { color: next });
                }}
              />
              <input
                className="mark-row__label"
                value={marker.label}
                aria-label="Mark name"
                onChange={(e) => updateMarker(marker.id, { label: e.target.value }, 'label')}
              />
              <button type="button" className="mark-row__time" onClick={() => seek(marker.time)} title="Jump to mark">
                {formatTimecode(marker.time)}
              </button>
              <IconButton icon="trash" label={`Delete ${marker.label}`} size={14} onClick={() => removeMarker(marker.id)} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
