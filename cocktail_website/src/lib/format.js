const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatPrice = (value) => currency.format(value);

/** Resolve a file from /public against Vite's `base` so it also works on GitHub Pages sub-paths. */
export const publicUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** localStorage that never throws (private mode, blocked storage, SSR). */
export const safeStorage = {
  get(key, fallback = null) {
    let raw = null;
    try {
      raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return raw ?? fallback; // unreadable storage, or a legacy non-JSON value
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable – ignore */
    }
  },
};
