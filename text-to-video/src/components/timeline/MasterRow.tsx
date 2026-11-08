import { isFlatEq } from '../../engine/eq';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../ui/Icon';
import { LevelMeter } from '../ui/LevelMeter';
import { MASTER_ROW_HEIGHT } from './constants';

/** The master bus as the last timeline row: click it to open the master settings. */
export function MasterRow({ headerWidth, width }: { headerWidth: number; width: number }) {
  const master = useEditor((s) => s.project.master);
  const selected = useEditor((s) => s.masterSelected);
  const selectMaster = useEditor((s) => s.selectMaster);
  const processing = [!isFlatEq(master.eq) && 'EQ', master.glue > 0 && 'Glue', master.limiter && 'Limiter'].filter(Boolean);

  return (
    <div className={`master-row ${selected ? 'is-selected' : ''}`} style={{ height: MASTER_ROW_HEIGHT }}>
      <button
        type="button"
        className="master-row__header"
        style={{ width: headerWidth }}
        aria-pressed={selected}
        onClick={selectMaster}
        title="Master bus — volume, EQ, glue and limiter for the whole mix"
      >
        <span className="master-row__icon">
          <Icon name="sliders" size={14} />
        </span>
        <span className="master-row__name">Master</span>
        <span className="master-row__volume">{Math.round(master.volume * 100)}%</span>
        <LevelMeter compact />
      </button>
      <div className="master-row__lane" style={{ width }} onClick={selectMaster} aria-hidden="true">
        <span>{processing.length ? processing.join(' · ') : 'Every track mixes down here'}</span>
      </div>
    </div>
  );
}
