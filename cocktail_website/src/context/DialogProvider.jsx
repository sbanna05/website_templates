import { useCallback, useMemo, useState } from "react";
import { DialogContext } from "./contexts";

/** Which modal is open (one at a time) plus optional props for it. */
export default function DialogProvider({ children }) {
  const [dialog, setDialog] = useState({ name: null, props: {} });

  const open = useCallback((name, props = {}) => setDialog({ name, props }), []);
  const close = useCallback(() => setDialog({ name: null, props: {} }), []);

  const value = useMemo(() => ({ ...dialog, open, close }), [dialog, open, close]);
  return <DialogContext value={value}>{children}</DialogContext>;
}
