import { useEffect, useMemo, useRef } from 'react';
import { projectDuration, timelineBeats } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { useUi } from '../../store/uiStore';
import { BeatMarkers } from './BeatMarkers';
import { HEADER_WIDTH, RULER_HEIGHT, TAIL_SECONDS, TRACK_HEIGHT } from './constants';
import { Playhead } from './Playhead';
import { TimeRuler } from './TimeRuler';
import { TimelineToolbar } from './TimelineToolbar';
import { TrackHeader } from './TrackHeader';
import { TrackLane } from './TrackLane';

export function Timeline() {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const pxPerSecond = useUi((s) => s.pxPerSecond);
  const scrollRef = useRef<HTMLDivElement>(null);

  const duration = projectDuration(project);
  const span = duration + TAIL_SECONDS;
  const contentWidth = span * pxPerSecond;
  const beats = useMemo(() => timelineBeats(project, assets), [project, assets]);
  const lanesHeight = project.tracks.reduce((h, t) => h + TRACK_HEIGHT[t.kind], 0);

  // Keep the playhead in view while playing.
  useEffect(
    () =>
      usePlayback.subscribe((state) => {
        const scroller = scrollRef.current;
        if (!scroller || !state.playing) return;
        const x = HEADER_WIDTH + state.time * useUi.getState().pxPerSecond;
        const right = scroller.scrollLeft + scroller.clientWidth;
        if (x > right - 60 || x < scroller.scrollLeft + HEADER_WIDTH) {
          scroller.scrollLeft = x - HEADER_WIDTH - 40;
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
      const { pxPerSecond: before, setZoom } = useUi.getState();
      const pointerX = event.clientX - scroller.getBoundingClientRect().left - HEADER_WIDTH + scroller.scrollLeft;
      const timeAtPointer = pointerX / before;
      setZoom(before * (event.deltaY < 0 ? 1.12 : 0.89));
      const after = useUi.getState().pxPerSecond;
      scroller.scrollLeft += timeAtPointer * (after - before);
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <section className="panel timeline" aria-label="Timeline">
      <TimelineToolbar />
      <div className="timeline__scroll" ref={scrollRef} data-lenis-prevent>
        <div className="timeline__canvas" style={{ width: HEADER_WIDTH + contentWidth }}>
          <div className="timeline__ruler-row" style={{ height: RULER_HEIGHT }}>
            <div className="timeline__corner" style={{ width: HEADER_WIDTH }}>
              <span>{project.tracks.length} tracks</span>
            </div>
            <div className="timeline__ruler-wrap">
              <TimeRuler width={contentWidth} pxPerSecond={pxPerSecond} duration={span} />
              <Playhead part="knob" pxPerSecond={pxPerSecond} />
            </div>
          </div>

          <div className="timeline__tracks">
            {project.tracks.map((track) => (
              <div key={track.id} className="track-row" data-track-id={track.id}>
                <TrackHeader track={track} height={TRACK_HEIGHT[track.kind]} />
                <TrackLane
                  track={track}
                  clips={project.clips.filter((c) => c.trackId === track.id)}
                  assets={assets}
                  selectedClipId={selectedClipId}
                  pxPerSecond={pxPerSecond}
                  beats={beats}
                  width={contentWidth}
                  height={TRACK_HEIGHT[track.kind]}
                />
              </div>
            ))}
            <div className="timeline__beats" style={{ left: HEADER_WIDTH }}>
              <BeatMarkers beats={beats} manual={project.manualBeats} pxPerSecond={pxPerSecond} width={contentWidth} height={lanesHeight} />
            </div>
          </div>

          <Playhead part="line" pxPerSecond={pxPerSecond} offset={HEADER_WIDTH} />
        </div>
      </div>
    </section>
  );
}
