import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../lib/format";

export default function ScrollUp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`scroll-up icon-btn ${visible ? "is-visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "instant" : "smooth" })}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <i className="ri-arrow-up-line" aria-hidden="true" />
    </button>
  );
}
