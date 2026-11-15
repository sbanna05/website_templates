import { useState } from 'react';
import { STEMS } from '../../engine/stems';
import { mergeBlocker } from '../../engine/merge';
import { useEditor, selectSelectedClip, type SyncSource } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { ZOOM_RANGE, useUi } from '../../store/uiStore';
import type { Track } from '../../types/project';
import { Button, IconButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';

const BEAT_DIVISIONS = [
  { beats: 1, label: '1', hint: 'every beat' },
  { beats: 2, label: '2', hint: 'every 2 beats' },
  { beats: 4, label: '1 bar', hint: 'every bar (4 beats)' },
  { beats: 8, label: '2 bars', hint: 'every 2 bars' },
  { beats: 16, label: '4 bars', hint: 'every 4 bars' },
] as const;

interface ViewFilter {
  id: string;
  label: string;
  icon: IconName;
  match: (track: Track) => boolean;
}

const KIND_FILTERS: ViewFilter[] = [
  { id: 'visual', label: 'Video', icon: 'film', match: (t) => t.kind === 'visual' },
  { id: 'text', label: 'Text', icon: 'text', match: (t) => t.kind === 'text' },
  { id: 'audio', label: 'Audio', icon: 'music', match: (t) => t.kind === 'audio' },
];

const STEM_FILTERS: ViewFilter[] = STEMS.map((stem) => ({
  id: stem.id,
  label: stem.label,
  icon: ({ vocals: 'mic', drums: 'beat', bass: 'curve', other: 'sparkle' } as const)[stem.id],
  match: (t: Track) => t.stem === stem.id,
}));

export function TimelineToolbar() {
  const selected = useEditor(selectSelectedClip);
  const selectedIds = useEditor((s) => s.selectedClipIds);
  const project = useEditor((s) => s.project);
  const { splitSelected, duplicateClips, deleteClips, mergeClips, toggleSnap, syncToBeats, clearManualBeats, addTrack, addMarker, undo, redo } =
    useEditor.getState();
  const count = selectedIds.length;
  const mergeHint = mergeBlocker(project.clips.filter((c) => selectedIds.includes(c.id)));
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { pxPerSecond, setZoom, zoomBy, tool, setTool, viewHidden, showOnly, showChords, toggleChords } = useUi();
  const [division, setDivision] = useState<number>(2);
  const [source, setSource] = useState<SyncSource>('beats');
  const [onBar, setOnBar] = useState(true);

  // Sync works on the selected clip's track (video or text), else the first video track.
  const syncTrack =
    selected && selected.kind !== 'audio'
      ? project.tracks.find((t) => t.id === selected.trackId)
      : project.tracks.find((t) => t.kind === 'visual');
  const unit = source === 'marks' ? 'marks' : 'beats';

  // View filters: which tracks are listed. Stem chips appear once stems sit on their own tracks.
  const allIds = project.tracks.map((t) => t.id);
  const visible = project.tracks.filter((t) => !viewHidden[t.id]);
  const filters = [...KIND_FILTERS, ...STEM_FILTERS.filter((f) => project.tracks.some(f.match))];
  const activeFilter = Object.keys(viewHidden).length === 0 ? 'all' : filters.find((f) => {
    const ids = project.tracks.filter(f.match).map((t) => t.id);
    return ids.length > 0 && ids.length === visible.length && visible.every((t) => f.match(t));
  })?.id;
  const audible = visible.filter((t) => t.kind !== 'text');
  const soloingVisible = audible.length > 0 && audible.every((t) => t.solo) && project.tracks.filter((t) => t.solo).length === audible.length;
  const anySolo = project.tracks.some((t) => t.solo);

  const soloVisible = () => {
    const next = !soloingVisible;
    const ids = new Set(audible.map((t) => t.id));
    useEditor.getState().commit((p) => ({ ...p, tracks: p.tracks.map((t) => ({ ...t, solo: next && ids.has(t.id) })) }));
  };

  return (
    <div className="timeline-toolbar" role="toolbar" aria-label="Timeline tools">
      <div className="timeline-toolbar__row">
        <div className="toolbar-group">
          <IconButton icon="undo" label="Undo (Ctrl Z)" disabled={!canUndo} onClick={undo} />
          <IconButton icon="redo" label="Redo (Ctrl ⇧ Z)" disabled={!canRedo} onClick={redo} />
          <span className="toolbar-divider" />
          <div className="tool-switch" role="radiogroup" aria-label="Pointer tool">
            <button type="button" role="radio" aria-checked={tool === 'select'} className={tool === 'select' ? 'is-active' : ''} title="Select & move (V)" onClick={() => setTool('select')}>
              <Icon name="cursor" size={14} /> Select
            </button>
            <button type="button" role="radio" aria-checked={tool === 'blade'} className={tool === 'blade' ? 'is-active' : ''} title="Blade — click a clip to cut it, Shift-click cuts every track (C)" onClick={() => setTool('blade')}>
              <Icon name="scissors" size={14} /> Blade
            </button>
          </div>
          <span className="toolbar-divider" />
          <div className="edit-actions">
            <Button size="sm" variant="ghost" icon="scissors" title="Split at the playhead (S)" onClick={() => splitSelected(usePlayback.getState().time)}>
              Split
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon="merge"
              disabled={Boolean(mergeHint)}
              title={mergeHint ? `Merge (Ctrl J) — ${mergeHint}` : `Merge ${count} parts into one (Ctrl J)`}
              onClick={() => void mergeClips(selectedIds, 'back-to-back')}
            >
              Merge
            </Button>
            <Button size="sm" variant="ghost" icon="copy" disabled={count === 0} title="Duplicate (Ctrl D)" onClick={() => duplicateClips(selectedIds)}>
              Duplicate
            </Button>
            <Button size="sm" variant="ghost" icon="trash" disabled={count === 0} title="Delete (Del)" onClick={() => deleteClips(selectedIds)}>
              Delete
            </Button>
            <IconButton icon="flag" label="Add mark at playhead (M)" onClick={() => addMarker(usePlayback.getState().time)} />
          </div>
          {count > 1 && (
            <span className="selection-pill" role="status">
              {count} selected
            </span>
          )}
        </div>

        <div className="toolbar-group">
          <IconButton icon="chord" label={showChords ? 'Hide bars & chords row' : 'Show bars & chords row'} active={showChords} onClick={toggleChords} />
          <span className="toolbar-divider" />
          <IconButton icon="zoom-out" label="Zoom out (−)" onClick={() => zoomBy(0.8)} />
          <input
            className="zoom-slider"
            type="range"
            aria-label="Timeline zoom"
            min={Math.log(ZOOM_RANGE.min)}
            max={Math.log(ZOOM_RANGE.max)}
            step={0.01}
            value={Math.log(pxPerSecond)}
            onChange={(e) => setZoom(Math.exp(Number(e.target.value)))}
          />
          <IconButton icon="zoom-in" label="Zoom in (+)" onClick={() => zoomBy(1.25)} />
        </div>
      </div>

      <div className="timeline-toolbar__row timeline-toolbar__row--sub">
        <div className="toolbar-group view-filter" role="group" aria-label="Show tracks">
          <span className="toolbar-label">View</span>
          <button type="button" className={`filter-chip ${activeFilter === 'all' ? 'is-active' : ''}`} onClick={() => showOnly([], allIds)}>
            All
          </button>
          {filters.map((f) => {
            const ids = project.tracks.filter(f.match).map((t) => t.id);
            return (
              <button
                key={f.id}
                type="button"
                className={`filter-chip ${activeFilter === f.id ? 'is-active' : ''}`}
                disabled={ids.length === 0}
                title={`Show only ${f.label.toLowerCase()} tracks (the rest still play)`}
                onClick={() => showOnly(activeFilter === f.id ? [] : ids, allIds)}
              >
                <Icon name={f.icon} size={12} /> {f.label}
              </button>
            );
          })}
          <button
            type="button"
            className={`filter-chip filter-chip--solo ${soloingVisible ? 'is-active' : ''}`}
            disabled={audible.length === 0}
            title={soloingVisible ? 'Hear every track again' : 'Hear only the tracks shown'}
            onClick={soloVisible}
          >
            S Solo shown
          </button>
          {anySolo && !soloingVisible && (
            <button
              type="button"
              className="filter-chip"
              title="Clear every solo"
              onClick={() => useEditor.getState().commit((p) => ({ ...p, tracks: p.tracks.map((t) => ({ ...t, solo: false })) }))}
            >
              Clear solo
            </button>
          )}
        </div>

        <div className="toolbar-group toolbar-group--beat">
          <IconButton icon="magnet" label={`Snap to beats: ${project.snapToBeats ? 'on' : 'off'}`} active={project.snapToBeats} onClick={toggleSnap} />
          <div className="beat-sync" role="group" aria-label="Beat sync">
            <div className="beat-sync__source" role="radiogroup" aria-label="Cut on">
              {(['beats', 'marks'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={source === value}
                  className={`beat-sync__source-item ${source === value ? 'is-active' : ''}`}
                  onClick={() => setSource(value)}
                >
                  {value === 'beats' ? 'Beats' : 'Marks'}
                </button>
              ))}
            </div>
            <span className="beat-sync__label">every</span>
            {(source === 'marks' ? BEAT_DIVISIONS.slice(0, 2) : BEAT_DIVISIONS).map((d) => (
              <button
                key={d.beats}
                type="button"
                className={`chip ${division === d.beats ? 'is-active' : ''}`}
                aria-pressed={division === d.beats}
                title={source === 'marks' ? `every ${d.beats} mark${d.beats > 1 ? 's' : ''}` : d.hint}
                onClick={() => setDivision(d.beats)}
              >
                {source === 'marks' ? d.beats : d.label}
              </button>
            ))}
            {source === 'beats' && (
              <label className="beat-sync__bar" title="Start the first cut on a bar line (the “one”)">
                <input type="checkbox" checked={onBar} onChange={(e) => setOnBar(e.target.checked)} />
                from bar
              </label>
            )}
            <Button
              size="sm"
              variant="primary"
              icon="wand"
              disabled={!syncTrack}
              title={syncTrack ? `Line up every clip on “${syncTrack.name}” with the ${unit}` : undefined}
              onClick={() => syncTrack && syncToBeats(syncTrack.id, source === 'marks' ? Math.min(division, 2) : division, source, onBar)}
            >
              Sync {syncTrack?.kind === 'text' ? 'text' : 'cuts'}
            </Button>
          </div>
          {project.manualBeats.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearManualBeats}>
              Clear {project.manualBeats.length} taps
            </Button>
          )}
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">Add</span>
          <Button size="sm" variant="ghost" icon="plus" onClick={() => addTrack('visual')}>Video</Button>
          <Button size="sm" variant="ghost" icon="plus" onClick={() => addTrack('text')}>Text</Button>
          <Button size="sm" variant="ghost" icon="plus" onClick={() => addTrack('audio')}>Audio</Button>
        </div>
      </div>
    </div>
  );
}
