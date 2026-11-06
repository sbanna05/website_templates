import { useEffect } from "react";

/**
 * Scroll-reveal for every element marked `data-reveal` (optionally
 * "fade" | "zoom" | "left" | "right", stagger with style={{ "--i": n }}).
 *
 * One IntersectionObserver for the whole app; a MutationObserver picks up
 * elements that appear later (route changes, API data). Hiding is opt-in via
 * `.can-reveal` on <html>, so content is never stuck invisible if the
 * observer is unavailable. Reduced-motion users and the accessible theme get
 * everything immediately (see base.css / accessible.css).
 */
export default function RevealManager() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const root = document.documentElement;
    root.classList.add("can-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => io.observe(el));
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("can-reveal");
    };
  }, []);

  return null;
}
