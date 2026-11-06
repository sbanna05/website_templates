import { useState } from "react";
import SmartImage from "./SmartImage";

/**
 * Visual toast stack (top-right, under the header).
 * The shrinking gold bar *is* the timer: when its CSS animation ends the toast
 * leaves. Hover or keyboard focus pauses it (WCAG 2.2.1 – enough time), and the
 * accessible theme gives it twice as long via --toast-ms.
 */
function Toast({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false);

  const handleAnimationEnd = (event) => {
    if (event.animationName === "toast-timer") setLeaving(true);
    if (event.animationName === "toast-out") onDismiss(toast.id);
  };

  const runAction = () => {
    toast.action.onClick();
    onDismiss(toast.id);
  };

  return (
    <li className={`toast ${leaving ? "is-leaving" : ""}`} onAnimationEnd={handleAnimationEnd}>
      <span className="toast__media" aria-hidden="true">
        {toast.image ? <SmartImage src={toast.image} alt="" width="40" height="40" /> : <i className={toast.icon ?? "ri-check-line"} />}
        <i className="ri-check-line toast__check" />
      </span>

      <div className="toast__text">
        <p className="toast__title">
          <strong>{toast.title}</strong> {toast.message}
        </p>
        {toast.meta && <p className="toast__meta">{toast.meta}</p>}
        {toast.action && (
          <button type="button" className="toast__action" onClick={runAction}>
            {toast.action.label}
          </button>
        )}
      </div>

      <button type="button" className="icon-btn icon-btn--sm toast__close" onClick={() => setLeaving(true)} aria-label="Dismiss notification">
        <i className="ri-close-line" aria-hidden="true" />
      </button>

      <span className="toast__timer" aria-hidden="true" />
    </li>
  );
}

export default function Toaster({ toasts, announcement, onDismiss }) {
  return (
    <section className="toaster" aria-label="Notifications">
      {/* Always mounted, so assistive tech reliably announces new messages. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
      <ol className="toaster__list">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </ol>
    </section>
  );
}
