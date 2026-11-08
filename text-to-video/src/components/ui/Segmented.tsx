interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { label: string; value: T; title?: string }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

export function Segmented<T extends string | number>({ label, value, options, onChange, hideLabel }: SegmentedProps<T>) {
  return (
    <div className="field">
      {!hideLabel && <span className="field__label">{label}</span>}
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            title={option.title}
            className={`segmented__item ${option.value === value ? 'is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
