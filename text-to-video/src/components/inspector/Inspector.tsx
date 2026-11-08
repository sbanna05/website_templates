import { useRef } from 'react';
import { useLenis } from '../../hooks/useLenis';
import { selectSelectedClip, useEditor } from '../../store/editorStore';
import type { Clip } from '../../types/project';
import { IconButton } from '../ui/Button';
import { AudioInspector } from './AudioInspector';
import { ProjectInspector } from './ProjectInspector';
import { TextInspector } from './TextInspector';
import { VisualInspector } from './VisualInspector';

const TITLES: Record<Clip['kind'], string> = { visual: 'Media clip', text: 'Text layer', audio: 'Music clip' };

export function Inspector() {
  const clip = useEditor(selectSelectedClip);
  const assetName = useEditor((s) => (clip && clip.kind !== 'text' ? s.assets[clip.assetId]?.name : undefined));
  const { duplicateClip, deleteClip } = useEditor.getState();
  const scrollRef = useRef<HTMLDivElement>(null);
  useLenis(scrollRef);

  return (
    <aside className="panel inspector" aria-label="Inspector">
      <header className="inspector__header">
        <div>
          <span className={`kind-dot kind-dot--${clip?.kind ?? 'project'}`} aria-hidden="true" />
          <h2>{clip ? TITLES[clip.kind] : 'Project'}</h2>
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
          <div className="panel__stack" key={clip?.id ?? 'project'}>
            {!clip && <ProjectInspector />}
            {clip?.kind === 'visual' && <VisualInspector clip={clip} />}
            {clip?.kind === 'audio' && <AudioInspector clip={clip} />}
            {clip?.kind === 'text' && <TextInspector clip={clip} />}
          </div>
        </div>
      </div>
    </aside>
  );
}
