import { useId } from 'react';

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** On/off switch. The whole row is the hit area; the hint is announced as the switch's description. */
export function Toggle({ label, hint, checked, disabled = false, onChange }: ToggleProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`} htmlFor={id}>
      <span className="toggle__text">
        <span>{label}</span>
        {hint && <small id={hintId}>{hint}</small>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </label>
  );
}
