import { useMemo, useRef } from 'react';
import { useLenis } from '../../hooks/useLenis';
import { useEditor } from '../../store/editorStore';
import { useUi, type LibraryTab } from '../../store/uiStore';
import { Icon, type IconName } from '../ui/Icon';
import { AssetCard } from './AssetCard';
import { DropZone } from './DropZone';
import { TextPresets } from './TextPresets';

const TABS: { id: LibraryTab; label: string; icon: IconName }[] = [
  { id: 'media', label: 'Media', icon: 'film' },
  { id: 'audio', label: 'Music', icon: 'music' },
  { id: 'text', label: 'Text', icon: 'text' },
];

export function MediaLibrary() {
  const tab = useUi((s) => s.libraryTab);
  const setTab = useUi((s) => s.setLibraryTab);
  const assets = useEditor((s) => s.assets);
  const scrollRef = useRef<HTMLDivElement>(null);
  useLenis(scrollRef);

  const { visuals, audio } = useMemo(() => {
    const list = Object.values(assets);
    return { visuals: list.filter((a) => a.kind !== 'audio'), audio: list.filter((a) => a.kind === 'audio') };
  }, [assets]);

  return (
    <aside className="panel library" aria-label="Library">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            className={`tabs__item ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel__scroll" ref={scrollRef}>
        <div className="panel__content">
          {tab === 'media' && (
            <>
              <DropZone accept="image/*,video/*" title="Import photos & videos" hint="Drop files or browse · MP4, MOV, WebM, JPG, PNG" />
              {visuals.length === 0 ? (
                <p className="panel-note">Imported clips land on the timeline automatically.</p>
              ) : (
                <div className="asset-grid">
                  {visuals.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} layout="tile" />
                  ))}
                </div>
              )}
            </>
          )}
          {tab === 'audio' && (
            <>
              <DropZone accept="audio/*" title="Import music" hint="MP3, WAV, M4A, OGG · beats detected automatically" />
              {audio.length === 0 ? (
                <p className="panel-note">Add several tracks — layer them, cut between them, or set each one's speed and pitch.</p>
              ) : (
                <div className="asset-list">
                  {audio.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} layout="row" />
                  ))}
                </div>
              )}
            </>
          )}
          {tab === 'text' && <TextPresets />}
        </div>
      </div>
    </aside>
  );
}
