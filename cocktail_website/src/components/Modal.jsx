import { useEffect, useId, useRef } from "react";

/**
 * Accessible modal built on the native <dialog> element:
 * focus trapping, Escape-to-close and top-layer rendering come for free.
 */
export default function Modal({ title, onClose, children, size = "md" }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const handleBackdropClick = (event) => {
    if (event.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="modal__panel page">
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
