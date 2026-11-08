import { useState } from 'react';
import { useEditor, selectSelectedClip } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { ZOOM_RANGE, useUi } from '../../store/uiStore';
import { Button, IconButton } from '../ui/Button';

const BEAT_DIVISIONS = [1, 2, 4, 8] as const;

export function TimelineToolbar() {
  const selected = useEditor(selectSelectedClip);
  const project = useEditor((s) => s.project);
  const { splitSelected, duplicateClip, deleteClip, toggleSnap, syncToBeats, clearManualBeats, addTrack, undo, redo } =
    useEditor.getState();
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { pxPerSecond, setZoom, zoomBy } = useUi();
  const [division, setDivision] = useState<(typeof BEAT_DIVISIONS)[number]>(2);

  const syncTrackId =
    selected?.kind === 'visual' ? selected.trackId : project.tracks.find((t) => t.kind === 'visual')?.id;

  return (
    <div className="timeline-toolbar" role="toolbar" aria-label="Timeline tools">
      <div className="toolbar-group">
        <IconButton icon="undo" label="Undo (Ctrl Z)" disabled={!canUndo} onClick={undo} />
        <IconButton icon="redo" label="Redo (Ctrl ⇧ Z)" disabled={!canRedo} onClick={redo} />
        <span className="toolbar-divider" />
        <IconButton icon="scissors" label="Split at playhead (S)" onClick={() => splitSelected(usePlayback.getState().time)} />
        <IconButton icon="copy" label="Duplicate (Ctrl D)" disabled={!selected} onClick={() => selected && duplicateClip(selected.id)} />
        <IconButton icon="trash" label="Delete (Del)" disabled={!selected} onClick={() => selected && deleteClip(selected.id)} />
      </div>

      <div className="toolbar-group toolbar-group--beat">
        <IconButton icon="magnet" label={`Snap to beats: ${project.snapToBeats ? 'on' : 'off'}`} active={project.snapToBeats} onClick={toggleSnap} />
        <div className="beat-sync" role="group" aria-label="Beat sync">
          <span className="beat-sync__label">Cut every</span>
          {BEAT_DIVISIONS.map((d) => (
            <button key={d} type="button" className={`chip ${division === d ? 'is-active' : ''}`} aria-pressed={division === d} onClick={() => setDivision(d)}>
              {d}
            </button>
          ))}
          <span className="beat-sync__label">beats</span>
          <Button size="sm" variant="primary" icon="wand" disabled={!syncTrackId} onClick={() => syncTrackId && syncToBeats(syncTrackId, division)}>
            Sync cuts
          </Button>
        </div>
        {project.manualBeats.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearManualBeats}>
            Clear {project.manualBeats.length} taps
          </Button>
        )}
      </div>

      <div className="toolbar-group">
        <Button size="sm" variant="ghost" icon="plus" onClick={() => addTrack('visual')}>Video</Button>
        <Button size="sm" variant="ghost" icon="plus" onClick={() => addTrack('text')}>Text</Button>
        <Button size="sm" variant="ghost" icon="plus" onClick={() => addTrack('audio')}>Music</Button>
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
  );
}
