import { useEffect } from 'react';
import { useEditor } from '../store/editorStore';
import { usePlayback } from '../store/playbackStore';
import { useUi } from '../store/uiStore';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) &&
  !(target instanceof HTMLInputElement && ['range', 'checkbox', 'radio', 'color'].includes(target.type));

export const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← / →', 'Step one frame (Shift: 1 s)'],
  ['S', 'Split at playhead'],
  ['B', 'Tap a beat marker'],
  ['M', 'Add a mark at the playhead'],
  ['T', 'Add text at playhead'],
  ['Del', 'Delete selected clip'],
  ['Ctrl D', 'Duplicate clip'],
  ['Ctrl Z / Ctrl ⇧ Z', 'Undo / redo'],
  ['+ / −', 'Zoom timeline'],
  ['Esc', 'Deselect'],
];

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || useUi.getState().exportOpen) return;
      const editor = useEditor.getState();
      const playback = usePlayback.getState();
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      const handlers: Record<string, () => void> = {
        ' ': () => playback.toggle(),
        arrowleft: () => playback.step(event.shiftKey ? -editor.project.fps : -1),
        arrowright: () => playback.step(event.shiftKey ? editor.project.fps : 1),
        s: () => !mod && editor.splitSelected(playback.time),
        b: () => editor.addManualBeat(playback.time),
        t: () => editor.addText(playback.time),
        m: () => editor.addMarker(playback.time),
        delete: () => editor.selectedClipId && editor.deleteClip(editor.selectedClipId),
        backspace: () => editor.selectedClipId && editor.deleteClip(editor.selectedClipId),
        d: () => mod && editor.selectedClipId && editor.duplicateClip(editor.selectedClipId),
        z: () => mod && (event.shiftKey ? editor.redo() : editor.undo()),
        y: () => mod && editor.redo(),
        '+': () => useUi.getState().zoomBy(1.25),
        '=': () => useUi.getState().zoomBy(1.25),
        '-': () => useUi.getState().zoomBy(0.8),
        escape: () => editor.select(null),
      };
      const handler = handlers[key];
      if (!handler) return;
      if (['d', 'z', 'y'].includes(key) && !mod) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
