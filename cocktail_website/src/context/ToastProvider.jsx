import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./contexts";
import Toaster from "../components/Toaster";

const MAX_VISIBLE = 3;
let nextId = 0;

/**
 * Small, non-blocking notifications ("Negroni added to cart").
 * notify({ key, title, message, meta, image, icon, action: { label, onClick } })
 *  - `key` replaces an existing toast with the same key (e.g. adding the same bottle twice)
 *  - the visible toast is mirrored into a polite live region, so screen readers hear it once
 */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [announcement, setAnnouncement] = useState("");

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const notify = useCallback((toast) => {
    const id = ++nextId;
    setToasts((list) => [...list.filter((t) => !toast.key || t.key !== toast.key), { ...toast, id }].slice(-MAX_VISIBLE));
    setAnnouncement([toast.title, toast.message, toast.meta].filter(Boolean).join(" "));
    return id;
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <Toaster toasts={toasts} announcement={announcement} onDismiss={dismiss} />
    </ToastContext>
  );
}
