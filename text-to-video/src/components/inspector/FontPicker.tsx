import { FONTS } from '../../config/fonts';

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
}

/** Each option is rendered in its own typeface so users pick by look. */
export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <div className="field">
      <span className="field__label">Font</span>
      <div className="font-picker" role="listbox" aria-label="Font" data-lenis-prevent>
        {FONTS.map((font) => (
          <button
            key={font.family}
            type="button"
            role="option"
            aria-selected={font.family === value}
            className={`font-picker__item ${font.family === value ? 'is-active' : ''}`}
            style={{ fontFamily: `"${font.family}"`, fontWeight: font.weights[font.weights.length - 1] }}
            onClick={() => onChange(font.family)}
          >
            <span>{font.label}</span>
            <small>{font.category}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
