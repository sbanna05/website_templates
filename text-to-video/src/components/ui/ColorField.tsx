import { useId } from 'react';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const SWATCHES = ['#f2f6f7', '#c3cfd6', '#0b0f12', '#98bdd5', '#46789b', '#a3c8b4', '#55876f', '#66a0a0', '#c4a070'];

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        <span>{label}</span>
        <span className="field__value">{value.toUpperCase()}</span>
      </label>
      <div className="color-field">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="color-field__swatches" role="group" aria-label={`${label} swatches`}>
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={`swatch ${swatch.toLowerCase() === value.toLowerCase() ? 'is-active' : ''}`}
              style={{ background: swatch }}
              aria-label={swatch}
              onClick={() => onChange(swatch)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
