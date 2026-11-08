import { ASPECT_OPTIONS } from '../../config/canvas';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { Button, IconButton } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { ShinyText } from '../ui/ShinyText';

export function TopBar() {
  const name = useEditor((s) => s.project.name);
  const aspect = useEditor((s) => s.project.aspect);
  const { setName, setAspect } = useEditor.getState();
  const openExport = () => useUi.getState().setExportOpen(true);
  const libraryOpen = useUi((s) => s.layout.libraryOpen);
  const inspectorOpen = useUi((s) => s.layout.inspectorOpen);
  const togglePanel = useUi((s) => s.togglePanel);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <ShinyText text="ArticVid" className="brand-name" />
      </div>

      <input
        className="topbar__name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Project name"
        spellCheck={false}
      />

      <div className="topbar__aspect">
        <Segmented
          label="Aspect ratio"
          hideLabel
          value={aspect}
          options={ASPECT_OPTIONS.map((o) => ({ label: o.label, value: o.value, title: o.hint }))}
          onChange={setAspect}
        />
      </div>

      <div className="topbar__panels" role="group" aria-label="Panels">
        <IconButton
          icon="panel-left"
          label={libraryOpen ? 'Hide library' : 'Show library'}
          active={libraryOpen}
          onClick={() => togglePanel('libraryOpen')}
        />
        <IconButton
          icon="panel-right"
          label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
          active={inspectorOpen}
          onClick={() => togglePanel('inspectorOpen')}
        />
      </div>

      <Button variant="primary" icon="download" onClick={openExport} className="topbar__export">
        Export MP4
      </Button>
    </header>
  );
}
