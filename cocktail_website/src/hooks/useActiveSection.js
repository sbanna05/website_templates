import { useEffect, useState } from "react";

/** Scroll-spy: returns the id of the section currently in the upper part of the viewport. */
export function useActiveSection(ids, enabled = true) {
  const [active, setActive] = useState(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!enabled) return undefined;

    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting));
        const first = key.split(",").find((id) => visible.get(id));
        if (first) setActive(first);
      },
      // A thin band just below the sticky header decides which section is "current".
      { rootMargin: "-20% 0px -70% 0px" },
    );

    key.split(",").forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [key, enabled]);

  return enabled ? active : null;
}
