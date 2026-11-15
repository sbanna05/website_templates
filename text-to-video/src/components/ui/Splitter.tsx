import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

interface SplitterProps {
  /** `vertical` = a column divider you drag left/right; `horizontal` = a row divider you drag up/down. */
  orientation: 'vertical' | 'horizontal';
  label: string;
  value: number;
  min: number;
  max: number;
  /** +1 when dragging right/down grows the value, −1 when it shrinks it (e.g. a panel on the right). */
  direction?: 1 | -1;
  onChange: (value: number) => void;
  onReset?: () => void;
  className?: string;
}

const KEY_STEP = 16;

/**
 * Accessible resize handle (WAI-ARIA "window splitter"): drag with the pointer,
 * or focus it and use the arrow keys (Shift for bigger steps), Home/End for the
 * limits; double-click or Enter resets the size.
 */
export function Splitter({ orientation, label, value, min, max, direction = 1, onChange, onReset, className = '' }: SplitterProps) {
  const drag = useRef<{ pointer: number; start: number } | null>(null);
  const axis = (e: PointerEvent) => (orientation === 'vertical' ? e.clientX : e.clientY);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: axis(event), start: value };
    document.body.dataset.resizing = orientation;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onChange(drag.current.start + (axis(event) - drag.current.pointer) * direction);
  };

  const endDrag = () => {
    drag.current = null;
    delete document.body.dataset.resizing;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const grow = orientation === 'vertical' ? ['ArrowRight'] : ['ArrowDown'];
    const shrink = orientation === 'vertical' ? ['ArrowLeft'] : ['ArrowUp'];
    let next: number | null = null;
    if (grow.includes(event.key)) next = value + step * direction;
    else if (shrink.includes(event.key)) next = value - step * direction;
    else if (event.key === 'Home') next = min;
    else if (event.key === 'End') next = max;
    else if (event.key === 'Enter' && onReset) {
      onReset();
      event.preventDefault();
      return;
    }
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div
      className={`splitter splitter--${orientation} ${className}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      title={`${label} — drag to resize${onReset ? ', double-click to reset' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
    >
      <span className="splitter__grip" aria-hidden="true" />
    </div>
  );
}
