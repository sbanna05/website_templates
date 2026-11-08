import { SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { useEditor } from '../../store/editorStore';
import { ColorField } from '../ui/ColorField';
import { Section } from '../ui/Section';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { BeatMatchPanel } from './BeatMatchPanel';
import { MarksSection } from './MarksSection';

export function ProjectInspector() {
  const project = useEditor((s) => s.project);
  const { setBackground, toggleSnap, clearManualBeats } = useEditor.getState();

  return (
    <>
      <div className="inspector-empty">
        <strong>Nothing selected</strong>
        <p>Select a clip on the timeline or the preview to edit it. These settings apply to the whole edit.</p>
      </div>
      <Section title="Canvas" icon="image">
        <ColorField label="Background" value={project.backgroundColor} onChange={setBackground} />
      </Section>
      <Section title="Beat grid" icon="beat">
        <Toggle label="Snap to beats" hint="Clip edges stick to beat markers while dragging" checked={project.snapToBeats} onChange={toggleSnap} />
        <p className="panel-note">
          Music you import is analysed for tempo automatically. Press <kbd>B</kbd> during playback to tap extra beats
          {project.manualBeats.length > 0 ? ` (${project.manualBeats.length} tapped).` : '.'}
        </p>
        {project.manualBeats.length > 0 && (
          <Button size="sm" variant="ghost" icon="trash" onClick={clearManualBeats}>
            Clear tapped beats
          </Button>
        )}
      </Section>
      <MarksSection />
      <BeatMatchPanel />
      <Section title="Keyboard shortcuts" icon="sliders" defaultOpen={false}>
        <dl className="shortcuts">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
