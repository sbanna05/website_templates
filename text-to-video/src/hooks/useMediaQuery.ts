import { useCallback, useSyncExternalStore } from 'react';

/** Below this width the panels stack instead of sitting side by side (keep in sync with layout.css). */
export const STACKED_QUERY = '(max-width: 980px)';
/** Phone width: one panel at a time under the preview, switched from a bottom tab bar. */
export const COMPACT_QUERY = '(max-width: 760px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
