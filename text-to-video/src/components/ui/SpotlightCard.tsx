import { useRef, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * A card with a soft light that follows the pointer — inspired by
 * react-bits' SpotlightCard, rewritten with CSS variables (no re-renders).
 */
export function SpotlightCard({ children, className = '', onPointerMove, ...rest }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (element) {
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      element.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }
    onPointerMove?.(event);
  };
  return (
    <div ref={ref} className={`spotlight-card ${className}`} onPointerMove={handleMove} {...rest}>
      {children}
    </div>
  );
}
