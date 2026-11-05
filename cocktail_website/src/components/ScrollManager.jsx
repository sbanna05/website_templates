import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { prefersReducedMotion } from "../lib/format";

/**
 * Handles every in-app jump in one place:
 *  - "/#section" (same or other page) → scroll to the section and move focus there
 *  - plain page change              → start at the top
 * Depends on `key`, so clicking the same link twice scrolls again.
 */
export default function ScrollManager() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;

    target.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, [pathname, hash, key]);

  return null;
}
