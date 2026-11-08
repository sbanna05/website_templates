import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { clipEnd, projectDuration, timelineBeats } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { LAYOUT_LIMITS, trackHeightOf, useUi } from '../../store/uiStore';
import type { Track } from '../../types/project';
import { Splitter } from '../ui/Splitter';
import { BeatMarkers } from './BeatMarkers';
import { RULER_HEIGHT, TAIL_SECONDS } from './constants';
import { MarkerFlags, MarkerLines } from './Markers';
import { MasterRow } from './MasterRow';
import { Playhead } from './Playhead';
import { TimeRuler } from './TimeRuler';
import { TimelineToolbar } from './TimelineToolbar';
import { TrackHeader } from './TrackHeader';
import { TrackLane } from './TrackLane';

/** Pointer travel (px) that turns a click on an empty lane into a selection box. */
const MARQUEE_THRESHOLD = 4;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function Timeline() {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const selectedClipIds = useEditor((s) => s.selectedClipIds);
  const pxPerSecond = useUi((s) => s.pxPerSecond);
  const headerWidth = useUi((s) => s.layout.headerWidth);
  const trackHeights = useUi((s) => s.trackHeights);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  const duration = projectDuration(project);
  const span = duration + TAIL_SECONDS;
  const contentWidth = span * pxPerSecond;
  const beats = useMemo(() => timelineBeats(project, assets), [project, assets]);
  const selected = useMemo(() => new Set(selectedClipIds), [selectedClipIds]);
  const rows = useMemo(
    () =>
      project.tracks.reduce<{ track: Track; top: number; height: number }[]>((acc, track) => {
        const previous = acc.at(-1);
        // Each row is its height plus a 1px border.
        const top = previous ? previous.top + previous.height + 1 : 0;
        return [...acc, { track, top, height: trackHeightOf(trackHeights, track) }];
      }, []),
    [project.tracks, trackHeights],
  );
  const lanesHeight = rows.reduce((h, r) => h + r.height + 1, 0);

  // Keep the playhead in view while playing.
  useEffect(
    () =>
      usePlayback.subscribe((state) => {
        const scroller = scrollRef.current;
        if (!scroller || !state.playing) return;
        const { pxPerSecond: pps, layout } = useUi.getState();
        const x = layout.headerWidth + state.time * pps;
        const right = scroller.scrollLeft + scroller.clientWidth;
        if (x > right - 60 || x < scroller.scrollLeft + layout.headerWidth) {
          scroller.scrollLeft = x - layout.headerWidth - 40;
        }
      }),
    [],
  );

  // Ctrl/⌘ + wheel zooms around the pointer.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const { pxPerSecond: before, setZoom, layout } = useUi.getState();
      const pointerX = event.clientX - scroller.getBoundingClientRect().left - layout.headerWidth + scroller.scrollLeft;
      const timeAtPointer = pointerX / before;
      setZoom(before * (event.deltaY < 0 ? 1.12 : 0.89));
      const after = useUi.getState().pxPerSecond;
      scroller.scrollLeft += timeAtPointer * (after - before);
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, []);

  /**
   * Pressing on an empty part of a lane: a click seeks (and clears the selection),
   * a drag draws a selection box that picks every clip it touches. Shift / Ctrl / ⌘
   * add to the current selection.
   */
  const onLanePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = tracksRef.current;
    if (!container || event.button !== 0) return;
    const rect = container.getBoundingClientRect();
    const toLocal = (e: PointerEvent | ReactPointerEvent) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const start = toLocal(event);
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    let dragging = false;

    const onMove = (e: PointerEvent) => {
      const at = toLocal(e);
      if (!dragging && Math.hypot(at.x - start.x, at.y - start.y) < MARQUEE_THRESHOLD) return;
      dragging = true;
      setBox({ x0: start.x, y0: start.y, x1: at.x, y1: at.y });
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setBox(null);
      const editor = useEditor.getState();
      if (!dragging) {
        if (!additive) editor.select(null);
        usePlayback.getState().seek(Math.max(0, (start.x - headerWidth) / pxPerSecond));
        return;
      }
      const end = toLocal(e);
      const [left, right] = [Math.min(start.x, end.x), Math.max(start.x, end.x)].map((x) => (x - headerWidth) / pxPerSecond);
      const [top, bottom] = [Math.min(start.y, end.y), Math.max(start.y, end.y)];
      const hit = rows
        .filter((r) => !r.track.locked && r.top < bottom && r.top + r.height > top)
        .flatMap((r) => editor.project.clips.filter((c) => c.trackId === r.track.id && c.start < right && clipEnd(c) > left))
        .map((c) => c.id);
      editor.selectMany(hit, additive);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const { setSize, resetSize } = useUi.getState();

  return (
    <section className="panel timeline" aria-label="Timeline">
      <TimelineToolbar />
      <div className="timeline__scroll" ref={scrollRef} data-lenis-prevent>
        <div className="timeline__canvas" style={{ width: headerWidth + contentWidth, '--header-w': `${headerWidth}px` } as CSSProperties}>
          <div className="timeline__ruler-row" style={{ height: RULER_HEIGHT }}>
            <div className="timeline__corner" style={{ width: headerWidth }}>
              <span>{project.tracks.length} tracks</span>
              <Splitter
                orientation="vertical"
                label="Track header width"
                className="timeline__header-split"
                value={headerWidth}
                {...LAYOUT_LIMITS.headerWidth}
                onChange={(v) => setSize('headerWidth', v)}
                onReset={() => resetSize('headerWidth')}
              />
            </div>
            <div className="timeline__ruler-wrap">
              <TimeRuler width={contentWidth} pxPerSecond={pxPerSecond} duration={span} />
              <MarkerFlags markers={project.markers} beats={beats} pxPerSecond={pxPerSecond} />
              <Playhead part="knob" pxPerSecond={pxPerSecond} />
            </div>
          </div>

          <div className="timeline__tracks" ref={tracksRef}>
            {rows.map(({ track, height }) => (
              <div key={track.id} className="track-row" data-track-id={track.id}>
                <TrackHeader track={track} height={height} width={headerWidth} />
                <TrackLane
                  track={track}
                  clips={project.clips.filter((c) => c.trackId === track.id)}
                  assets={assets}
                  selected={selected}
                  pxPerSecond={pxPerSecond}
                  beats={beats}
                  width={contentWidth}
                  height={height}
                  onBackgroundPointerDown={onLanePointerDown}
                />
              </div>
            ))}
            <div className="timeline__beats" style={{ left: headerWidth, height: lanesHeight }}>
              <BeatMarkers beats={beats} manual={project.manualBeats} pxPerSecond={pxPerSecond} width={contentWidth} height={lanesHeight} />
              <MarkerLines markers={project.markers} pxPerSecond={pxPerSecond} />
            </div>
            {box && (
              <div
                className="timeline__marquee"
                aria-hidden="true"
                style={{
                  left: Math.min(box.x0, box.x1),
                  top: Math.min(box.y0, box.y1),
                  width: Math.abs(box.x1 - box.x0),
                  height: Math.abs(box.y1 - box.y0),
                }}
              />
            )}
          </div>

          <MasterRow headerWidth={headerWidth} width={contentWidth} />

          <Playhead part="line" pxPerSecond={pxPerSecond} offset={headerWidth} />
        </div>
      </div>
    </section>
  );
}
