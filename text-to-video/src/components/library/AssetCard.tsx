import type { Asset } from '../../types/project';
import { formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { SpotlightCard } from '../ui/SpotlightCard';
import { ASSET_DRAG_TYPE } from './dnd';
import { Waveform } from '../timeline/Waveform';

interface AssetCardProps {
  asset: Asset;
  layout: 'tile' | 'row';
}

export function AssetCard({ asset, layout }: AssetCardProps) {
  const addAssetToTimeline = useEditor((s) => s.addAssetToTimeline);
  const removeAsset = useEditor((s) => s.removeAsset);
  const ready = asset.status === 'ready';
  const usageCount = useEditor((s) => s.project.clips.filter((c) => c.kind !== 'text' && c.assetId === asset.id).length);

  return (
    <SpotlightCard
      className={`asset-card asset-card--${layout} ${ready ? '' : 'is-loading'}`}
      draggable={ready}
      onDragStart={(e) => {
        e.dataTransfer.setData(ASSET_DRAG_TYPE, asset.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onDoubleClick={() => addAssetToTimeline(asset.id)}
      title={ready ? 'Drag onto the timeline, or double-click to append' : 'Importing…'}
    >
      <div className="asset-card__media">
        {asset.kind === 'audio' ? (
          asset.waveform ? (
            <Waveform peaks={asset.waveform} />
          ) : (
            <Icon name="music" size={22} />
          )
        ) : asset.thumbnail ? (
          <img src={asset.thumbnail} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className="spinner" aria-label="Loading" />
        )}
        {asset.kind !== 'image' && ready && <span className="asset-card__duration">{formatTimecode(asset.duration, false)}</span>}
        {asset.kind === 'video' && <Icon name="video" size={14} className="asset-card__kind" />}
      </div>
      <div className="asset-card__meta">
        <span className="asset-card__name">{asset.name}</span>
        <span className="asset-card__tags">
          {asset.beats && asset.beats.bpm > 0 && <span className="tag tag--positive">{Math.round(asset.beats.bpm)} BPM</span>}
          {asset.kind === 'audio' && ready && !asset.beats && <span className="tag">Analyzing…</span>}
          {usageCount > 0 && <span className="tag">{usageCount}× used</span>}
        </span>
      </div>
      {ready && (
        <div className="asset-card__actions">
          <IconButton icon="plus" label="Add to timeline" size={15} onClick={() => addAssetToTimeline(asset.id)} />
          <IconButton icon="trash" label="Remove from library" size={15} onClick={() => removeAsset(asset.id)} />
        </div>
      )}
    </SpotlightCard>
  );
}
