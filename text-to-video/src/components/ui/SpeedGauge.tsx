import { clamp } from '../../lib/math';
import { formatSpeed } from '../../lib/time';

interface SpeedGaugeProps {
  speed: number;
  min: number;
  max: number;
}

/** Semicircular speedometer on a log scale, so 0.5× and 2× sit symmetrically around 1×. */
export function SpeedGauge({ speed, min, max }: SpeedGaugeProps) {
  const toAngle = (v: number) => {
    const t = (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min));
    return -90 + clamp(t, 0, 1) * 180;
  };
  const angle = toAngle(speed);
  const tone = speed < 0.98 ? 'slow' : speed > 1.02 ? 'fast' : 'normal';
  const ticks = [0.25, 0.5, 1, 2, 4].filter((v) => v >= min && v <= max);
  const arc = (from: number, to: number) => {
    const p = (deg: number) => {
      const r = ((deg - 90) * Math.PI) / 180;
      return `${50 + 40 * Math.cos(r)} ${50 + 40 * Math.sin(r)}`;
    };
    return `M ${p(from)} A 40 40 0 0 1 ${p(to)}`;
  };

  return (
    <div className={`speed-gauge speed-gauge--${tone}`} role="img" aria-label={`Speed ${formatSpeed(speed)}`}>
      <svg viewBox="0 0 100 58">
        <path d={arc(-90, 90)} className="speed-gauge__track" />
        <path d={arc(Math.min(toAngle(1), angle), Math.max(toAngle(1), angle))} className="speed-gauge__fill" />
        {ticks.map((v) => {
          const r = ((toAngle(v) - 90) * Math.PI) / 180;
          return (
            <g key={v}>
              <line x1={50 + 34 * Math.cos(r)} y1={50 + 34 * Math.sin(r)} x2={50 + 30 * Math.cos(r)} y2={50 + 30 * Math.sin(r)} className="speed-gauge__tick" />
              <text x={50 + 23 * Math.cos(r)} y={52 + 23 * Math.sin(r)} className="speed-gauge__label">
                {v}
              </text>
            </g>
          );
        })}
        <line x1="50" y1="50" x2="50" y2="17" className="speed-gauge__needle" style={{ transform: `rotate(${angle}deg)` }} />
        <circle cx="50" cy="50" r="3.5" className="speed-gauge__hub" />
      </svg>
      <strong>{formatSpeed(speed)}</strong>
      <span>{tone === 'slow' ? 'Slow motion' : tone === 'fast' ? 'Fast forward' : 'Normal'}</span>
    </div>
  );
}
