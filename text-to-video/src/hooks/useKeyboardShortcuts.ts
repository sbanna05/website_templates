import { useEffect } from 'react';
import { useEditor } from '../store/editorStore';
import { useSaveStatus } from '../store/saveStore';
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
  ['V / C', 'Select tool / Blade tool (click a clip to cut, Shift-click cuts all tracks)'],
  ['B', 'Tap a beat marker'],
  ['M', 'Add a mark at the playhead'],
  ['T', 'Add text at playhead'],
  ['Click / Ctrl-click / Shift-click', 'Select one / toggle / add clips'],
  ['Drag on empty lanes', 'Box-select clips'],
  ['Ctrl A', 'Select all clips'],
  ['Del', 'Delete selected clips'],
  ['Ctrl D', 'Duplicate selected clips'],
  ['Ctrl J', 'Merge (join) selected parts'],
  ['Ctrl Z / Ctrl ⇧ Z', 'Undo / redo'],
  ['Ctrl S / Ctrl ⇧ S', 'Save / save as project file'],
  ['Ctrl O', 'Open a project file'],
  ['+ / −', 'Zoom timeline'],
  ['Esc', 'Deselect'],
];

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      // Save / open work everywhere, even while typing — and never trigger the browser's own "save page".
      if (mod && ['s', 'o'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        const files = useSaveStatus.getState();
        if (event.key.toLowerCase() === 'o') void files.open();
        else void files.save(event.shiftKey);
        return;
      }
      if (isTyping(event.target) || useUi.getState().exportOpen || useSaveStatus.getState().busy) return;
      const editor = useEditor.getState();
      const playback = usePlayback.getState();
      const key = event.key.toLowerCase();

      const handlers: Record<string, () => void> = {
        ' ': () => playback.toggle(),
        arrowleft: () => playback.step(event.shiftKey ? -editor.project.fps : -1),
        arrowright: () => playback.step(event.shiftKey ? editor.project.fps : 1),
        s: () => !mod && editor.splitSelected(playback.time),
        b: () => editor.addManualBeat(playback.time),
        t: () => editor.addText(playback.time),
        m: () => editor.addMarker(playback.time),
        v: () => !mod && useUi.getState().setTool('select'),
        c: () => !mod && useUi.getState().setTool('blade'),
        delete: () => editor.deleteClips(editor.selectedClipIds),
        backspace: () => editor.deleteClips(editor.selectedClipIds),
        d: () => editor.duplicateClips(editor.selectedClipIds),
        a: () => editor.selectAll(),
        j: () => void editor.mergeClips(editor.selectedClipIds, 'back-to-back'),
        z: () => mod && (event.shiftKey ? editor.redo() : editor.undo()),
        y: () => mod && editor.redo(),
        '+': () => useUi.getState().zoomBy(1.25),
        '=': () => useUi.getState().zoomBy(1.25),
        '-': () => useUi.getState().zoomBy(0.8),
        escape: () => editor.select(null),
      };
      const handler = handlers[key];
      if (!handler) return;
      if (['d', 'z', 'y', 'a', 'j'].includes(key) && !mod) return;
      // Leave Ctrl/⌘ + C / V to the browser (copy & paste).
      if (['c', 'v'].includes(key) && mod) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
