import { useEditor } from '../../store/editorStore';
import { useUi, type MobilePane } from '../../store/uiStore';
import { Icon, type IconName } from '../ui/Icon';

const PANES: { id: MobilePane; label: string; icon: IconName }[] = [
  { id: 'timeline', label: 'Timeline', icon: 'layers' },
  { id: 'library', label: 'Media', icon: 'image' },
  { id: 'inspector', label: 'Adjust', icon: 'sliders' },
];

/** Phone-width tab bar: picks which panel fills the space under the preview. */
export function MobileNav() {
  const pane = useUi((s) => s.mobilePane);
  const setPane = useUi((s) => s.setMobilePane);
  const selectedCount = useEditor((s) => s.selectedClipIds.length);

  return (
    <nav className="mobile-nav" aria-label="Panels">
      {PANES.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`mobile-nav__item ${pane === p.id ? 'is-active' : ''}`}
          aria-current={pane === p.id ? 'true' : undefined}
          onClick={() => setPane(p.id)}
        >
          <Icon name={p.icon} size={20} />
          <span>{p.label}</span>
          {p.id === 'inspector' && selectedCount > 0 && pane !== 'inspector' && (
            <span className="mobile-nav__count" aria-label={`${selectedCount} selected`}>
              {selectedCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
