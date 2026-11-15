import Lenis from 'lenis';
import { useEffect, type RefObject } from 'react';

/** Smooth, inertia-based scrolling for a scrollable panel (wrapper must contain a single content child). */
export function useLenis(wrapperRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = wrapper?.firstElementChild;
    if (!wrapper || !content || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      wrapper,
      content,
      autoRaf: true,
      lerp: 0.14,
      // Let range sliders, selects and textareas keep native wheel behaviour.
      prevent: (node) => node.closest('textarea, select, [data-lenis-prevent]') !== null,
    });
    return () => lenis.destroy();
  }, [wrapperRef]);
}
