import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/format";

/**
 * Back-to-top button wrapped in a gold reading-progress ring.
 * Progress is written straight to the SVG (no React re-render per scroll frame).
 */
export default function ScrollUp() {
  const [visible, setVisible] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) barRef.current.style.strokeDashoffset = String(100 - progress * 100);
      setVisible(window.scrollY > 400);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
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
      <svg className="scroll-up__ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <circle className="scroll-up__track" cx="24" cy="24" r="22" pathLength="100" />
        <circle ref={barRef} className="scroll-up__bar" cx="24" cy="24" r="22" pathLength="100" />
      </svg>
      <i className="ri-arrow-up-line" aria-hidden="true" />
    </button>
  );
}
