import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useEditor } from '../../store/editorStore';
import { selectUnsavedFile, useSaveStatus } from '../../store/saveStore';
import { Icon, type IconName } from '../ui/Icon';

interface Item {
  label: string;
  icon: IconName;
  shortcut: string;
  run: () => void;
}

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * "Project" menu (New / Open / Save / Save as) plus a quiet save indicator.
 * WAI-ARIA menu button: ↑/↓ move, Esc closes and returns focus, clicks outside close.
 */
export function ProjectMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { autosave, savedAt, fileName, fileProject } = useSaveStatus();
  const project = useEditor((s) => s.project);
  const unsaved = selectUnsavedFile(fileProject, project);

  const { save, open: openProject, newProject } = useSaveStatus.getState();
  const items: Item[] = [
    { label: 'New project', icon: 'plus', shortcut: '', run: newProject },
    { label: 'Open…', icon: 'folder', shortcut: 'Ctrl O', run: () => void openProject() },
    { label: fileName ? 'Save' : 'Save…', icon: 'save', shortcut: 'Ctrl S', run: () => void save() },
    { label: 'Save as…', icon: 'download', shortcut: 'Ctrl ⇧ S', run: () => void save(true) },
  ];

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowDown') entries[(index + 1) % entries.length]?.focus();
    else if (event.key === 'ArrowUp') entries[(index - 1 + entries.length) % entries.length]?.focus();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const status =
    autosave === 'saving'
      ? 'Saving…'
      : autosave === 'error'
        ? 'Autosave failed'
        : savedAt
          ? `Autosaved ${timeOf(savedAt)}`
          : 'Autosave on';

  return (
    <div className="project-menu">
      <button
        ref={buttonRef}
        type="button"
        className="project-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="folder" size={16} />
        <span>Project</span>
        <Icon name="chevron" size={13} />
      </button>
      <span
        className={`save-status save-status--${autosave} ${unsaved ? 'is-unsaved' : ''}`}
        role="status"
        title={fileName ? `${unsaved ? 'Changes not yet saved to' : 'Saved to'} ${fileName}. Work is also autosaved in this browser.` : 'Your work is autosaved in this browser. Use Save to keep a project file.'}
      >
        <span className="save-status__dot" aria-hidden="true" />
        {status}
        {fileName && <span className="save-status__file">· {fileName}{unsaved ? ' •' : ''}</span>}
      </span>
      {open && (
        <div ref={menuRef} className="project-menu__list" role="menu" aria-label="Project" onKeyDown={onMenuKey}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="project-menu__item"
              onClick={() => {
                close();
                item.run();
              }}
            >
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ))}
          <p className="project-menu__note">Everything is also autosaved in this browser and restored when you come back.</p>
        </div>
      )}
    </div>
  );
}
