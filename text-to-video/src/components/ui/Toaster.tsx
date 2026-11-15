import { useToasts } from '../../store/toastStore';
import { Icon } from './Icon';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <span>{t.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
