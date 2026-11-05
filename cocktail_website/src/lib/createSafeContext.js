import { createContext, useContext } from "react";

/**
 * Creates a context + hook pair that throws a helpful error when the hook
 * is used outside its provider (instead of silently returning `undefined`).
 */
export function createSafeContext(displayName) {
  const Context = createContext(null);
  Context.displayName = displayName;

  function useSafeContext() {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`use${displayName} must be used inside <${displayName}Provider>`);
    }
    return value;
  }

  return [Context, useSafeContext];
}
