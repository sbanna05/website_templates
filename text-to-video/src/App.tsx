import { gsap } from 'gsap';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { ExportDialog } from './components/export/ExportDialog';
import { Inspector } from './components/inspector/Inspector';
import { TopBar } from './components/layout/TopBar';
import { MediaLibrary } from './components/library/MediaLibrary';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Timeline } from './components/timeline/Timeline';
import { Icon } from './components/ui/Icon';
import { PanelBoundary } from './components/ui/PanelBoundary';
import { Splitter } from './components/ui/Splitter';
import { Toaster } from './components/ui/Toaster';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditor } from './store/editorStore';
import { useSaveStatus } from './store/saveStore';
import { LAYOUT_LIMITS, useUi } from './store/uiStore';

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

export default function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [fileOver, setFileOver] = useState(false);
  const layout = useUi((s) => s.layout);
  const { setSize, resetSize } = useUi.getState();
  const busy = useSaveStatus((s) => s.busy);
  useKeyboardShortcuts();

  // Bring back the last session (autosave), then keep saving every change.
  useEffect(() => {
    void useSaveStatus.getState().init();
  }, []);

  // Panel sizes are CSS variables, so the grid (and its responsive fallbacks) stays in CSS.
  // Side panels are capped relative to the window so the preview never gets squeezed out on small screens.
  const workspaceStyle = {
    '--panel-w': layout.libraryOpen ? `min(${layout.libraryWidth}px, 28vw)` : '0px',
    '--inspector-w': layout.inspectorOpen ? `min(${layout.inspectorWidth}px, 34vw)` : '0px',
    '--timeline-h': `${layout.timelineHeight}px`,
  } as CSSProperties;

  // Staggered entrance for the panels (skipped for reduced-motion users).
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('.topbar', { y: -16, autoAlpha: 0, duration: 0.6, ease: 'expo.out' });
      gsap.from('.panel', { y: 22, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.1 });
    }, shellRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      className="app"
      ref={shellRef}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setFileOver(true);
      }}
      onDragLeave={(e) => e.relatedTarget === null && setFileOver(false)}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setFileOver(false);
        void useEditor.getState().importFiles([...e.dataTransfer.files]);
      }}
    >
      <TopBar />
      <main
        className="workspace"
        style={workspaceStyle}
        data-library={layout.libraryOpen ? 'open' : 'closed'}
        data-inspector={layout.inspectorOpen ? 'open' : 'closed'}
      >
        {layout.libraryOpen && (
          <PanelBoundary name="library" className="library">
            <MediaLibrary />
          </PanelBoundary>
        )}
        {layout.libraryOpen && (
          <Splitter
            orientation="vertical"
            label="Library width"
            className="workspace__split-library"
            value={layout.libraryWidth}
            {...LAYOUT_LIMITS.libraryWidth}
            onChange={(v) => setSize('libraryWidth', v)}
            onReset={() => resetSize('libraryWidth')}
          />
        )}
        <PanelBoundary name="preview" className="preview">
          <PreviewPanel />
        </PanelBoundary>
        {layout.inspectorOpen && (
          <Splitter
            orientation="vertical"
            label="Inspector width"
            className="workspace__split-inspector"
            direction={-1}
            value={layout.inspectorWidth}
            {...LAYOUT_LIMITS.inspectorWidth}
            onChange={(v) => setSize('inspectorWidth', v)}
            onReset={() => resetSize('inspectorWidth')}
          />
        )}
        {layout.inspectorOpen && (
          <PanelBoundary name="inspector" className="inspector">
            <Inspector />
          </PanelBoundary>
        )}
        <Splitter
          orientation="horizontal"
          label="Timeline height"
          className="workspace__split-timeline"
          direction={-1}
          value={layout.timelineHeight}
          {...LAYOUT_LIMITS.timelineHeight}
          onChange={(v) => setSize('timelineHeight', v)}
          onReset={() => resetSize('timelineHeight')}
        />
        <PanelBoundary name="timeline" className="timeline">
          <Timeline />
        </PanelBoundary>
      </main>
      <ExportDialog />
      <Toaster />
      {busy && (
        <div className="busy-overlay" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>{busy}</span>
        </div>
      )}
      {fileOver && (
        <div className="file-overlay" aria-hidden="true">
          <div>
            <Icon name="upload" size={34} />
            <strong>Drop to import</strong>
            <span>Photos, videos and music</span>
          </div>
        </div>
      )}
    </div>
  );
}
