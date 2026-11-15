import { useId, type CSSProperties } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Double-clicking the label resets to this value. */
  defaultValue?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 0.01, defaultValue, format, onChange }: SliderProps) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="field slider">
      <label
        htmlFor={id}
        className="field__label"
        onDoubleClick={defaultValue !== undefined ? () => onChange(defaultValue) : undefined}
        title={defaultValue !== undefined ? 'Double-click to reset' : undefined}
      >
        <span>{label}</span>
        <output className="field__value" htmlFor={id}>
          {format ? format(value) : value}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${percent}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
