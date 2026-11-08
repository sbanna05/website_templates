import { useId } from 'react';

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        <span>{label}</span>
      </label>
      <div className="select">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
