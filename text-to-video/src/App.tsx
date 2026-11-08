import { gsap } from 'gsap';
import { useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { ExportDialog } from './components/export/ExportDialog';
import { Inspector } from './components/inspector/Inspector';
import { TopBar } from './components/layout/TopBar';
import { MediaLibrary } from './components/library/MediaLibrary';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Timeline } from './components/timeline/Timeline';
import { Icon } from './components/ui/Icon';
import { Toaster } from './components/ui/Toaster';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditor } from './store/editorStore';

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

export default function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [fileOver, setFileOver] = useState(false);
  useKeyboardShortcuts();

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
      <main className="workspace">
        <MediaLibrary />
        <PreviewPanel />
        <Inspector />
        <Timeline />
      </main>
      <ExportDialog />
      <Toaster />
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
