import { useId } from 'react';

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <label className="toggle" htmlFor={id}>
      <span className="toggle__text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </label>
  );
}
