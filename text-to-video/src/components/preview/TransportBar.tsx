import { projectDuration } from '../../engine/timeline';
import { formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { BeatIndicator } from './BeatIndicator';
import { DeckReadout } from './DeckReadout';

export function TransportBar() {
  const { time, playing, loop, preparing, toggle, seek, step, toggleLoop } = usePlayback();
  const duration = useEditor((s) => projectDuration(s.project));
  const addManualBeat = useEditor((s) => s.addManualBeat);

  return (
    <div className="transport">
      <div className="transport__time" aria-label="Current time">
        <span>{formatTimecode(time)}</span>
        <span className="transport__divider">/</span>
        <span className="transport__total">{formatTimecode(duration)}</span>
      </div>

      <div className="transport__controls">
        <IconButton icon="skip-back" label="Go to start" onClick={() => seek(0)} />
        <IconButton icon="chevron" label="Previous frame" className="rotate-90" onClick={() => step(-1)} />
        <button
          type="button"
          className={`play-button ${playing ? 'is-playing' : ''}`}
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={preparing}
        >
          {preparing ? <span className="spinner" /> : <Icon name={playing ? 'pause' : 'play'} size={20} />}
        </button>
        <IconButton icon="chevron" label="Next frame" className="rotate-270" onClick={() => step(1)} />
        <IconButton icon="repeat" label="Loop playback" active={loop} onClick={toggleLoop} />
      </div>

      <div className="transport__extras">
        <DeckReadout />
        <button type="button" className="tap-beat" onClick={() => addManualBeat(time)} title="Tap along to mark beats (B)">
          <Icon name="beat" size={15} /> Tap beat
        </button>
        <BeatIndicator />
      </div>
    </div>
  );
}
