import { useRef } from 'react';
import { useLenis } from '../../hooks/useLenis';
import { selectSelectedClip, useEditor } from '../../store/editorStore';
import type { Clip } from '../../types/project';
import { IconButton } from '../ui/Button';
import { AudioInspector } from './AudioInspector';
import { MasterInspector } from './MasterInspector';
import { MultiInspector } from './MultiInspector';
import { ProjectInspector } from './ProjectInspector';
import { TextInspector } from './TextInspector';
import { VisualInspector } from './VisualInspector';

const TITLES: Record<Clip['kind'], string> = { visual: 'Media clip', text: 'Text layer', audio: 'Music clip' };

export function Inspector() {
  const clip = useEditor(selectSelectedClip);
  const count = useEditor((s) => s.selectedClipIds.length);
  const master = useEditor((s) => s.masterSelected);
  const assetName = useEditor((s) => (clip && clip.kind !== 'text' ? s.assets[clip.assetId]?.name : undefined));
  const { duplicateClip, deleteClip } = useEditor.getState();
  const view = master ? 'master' : count > 1 ? 'multi' : clip ? clip.kind : 'project';
  const title = master ? 'Master bus' : count > 1 ? 'Multiple clips' : clip ? TITLES[clip.kind] : 'Project';
  const scrollRef = useRef<HTMLDivElement>(null);
  useLenis(scrollRef);

  return (
    <aside className="panel inspector" aria-label="Inspector">
      <header className="inspector__header">
        <div>
          <span className={`kind-dot kind-dot--${view}`} aria-hidden="true" />
          <h2>{title}</h2>
          {assetName && <p title={assetName}>{assetName}</p>}
        </div>
        {clip && (
          <div className="inspector__actions">
            <IconButton icon="copy" label="Duplicate clip" onClick={() => duplicateClip(clip.id)} />
            <IconButton icon="trash" label="Delete clip" onClick={() => deleteClip(clip.id)} />
          </div>
        )}
      </header>
      <div className="panel__scroll" ref={scrollRef}>
        {/* Keyed so collapsible state resets per clip. */}
        <div className="panel__content">
          <div className="panel__stack inspector__view" key={view === 'multi' ? 'multi' : (clip?.id ?? view)}>
            {view === 'project' && <ProjectInspector />}
            {view === 'master' && <MasterInspector />}
            {view === 'multi' && <MultiInspector />}
            {clip?.kind === 'visual' && <VisualInspector clip={clip} />}
            {clip?.kind === 'audio' && <AudioInspector clip={clip} />}
            {clip?.kind === 'text' && <TextInspector clip={clip} />}
          </div>
        </div>
      </div>
    </aside>
  );
}
