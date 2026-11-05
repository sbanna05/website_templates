import { useId } from "react";

/** Labelled form control (input or textarea) – one place for label/id wiring and styling. */
export default function Field({ label, as = "input", className = "", ...props }) {
  const Control = as;
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <Control id={id} className="field__control" {...props} />
    </div>
  );
}
