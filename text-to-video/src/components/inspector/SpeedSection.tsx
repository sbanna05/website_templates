import { SPEED_PRESETS, SPEED_RANGE } from '../../config/options';
import { formatSpeed } from '../../lib/time';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { SpeedGauge } from '../ui/SpeedGauge';

interface SpeedSectionProps {
  speed: number;
  onChange: (speed: number, key?: string) => void;
  note?: string;
}

export function SpeedSection({ speed, onChange, note }: SpeedSectionProps) {
  return (
    <Section title="Speed" icon="gauge">
      <SpeedGauge speed={speed} min={SPEED_RANGE.min} max={SPEED_RANGE.max} />
      <div className="chip-row" role="group" aria-label="Speed presets">
        {SPEED_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`chip ${Math.abs(speed - preset) < 1e-3 ? 'is-active' : ''}`}
            onClick={() => onChange(preset)}
          >
            {formatSpeed(preset)}
          </button>
        ))}
      </div>
      <Slider
        label="Custom speed"
        value={speed}
        min={SPEED_RANGE.min}
        max={SPEED_RANGE.max}
        step={0.05}
        defaultValue={1}
        format={formatSpeed}
        onChange={(v) => onChange(v, 'speed')}
      />
      {note && <p className="panel-note">{note}</p>}
    </Section>
  );
}
