import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

const GAP = 8;
let nextId = 0;

/**
 * A real tooltip for icon-only buttons, shown on hover and on keyboard
 * focus (the native `title` attribute does neither reliably). It describes
 * the control; the control still needs its own `aria-label`.
 *
 *   <button aria-label="Next page" appTooltip="Next page" tooltipKey="→">
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focus)': 'onFocus()',
    '(blur)': 'hide()',
    '(click)': 'hide()',
    '(keydown.escape)': 'hide()',
  },
})
export class Tooltip implements OnDestroy {
  readonly appTooltip = input.required<string>();
  /** Keyboard shortcut shown beside the label. */
  readonly tooltipKey = input<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private element: HTMLElement | null = null;

  protected onFocus(): void {
    // Only for keyboard focus: a tap or click should not leave a tooltip behind.
    if (this.host.matches(':focus-visible')) this.show();
  }

  protected show(): void {
    if (this.element || !this.appTooltip()) return;

    const tooltip = this.document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.id = `tooltip-${(nextId += 1)}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = this.appTooltip();

    const key = this.tooltipKey();
    if (key) {
      const kbd = this.document.createElement('kbd');
      kbd.textContent = key;
      tooltip.append(kbd);
    }

    this.document.body.append(tooltip);
    this.element = tooltip;
    this.place(tooltip);
  }

  /** Above the control when there is room, otherwise below, and always on screen. */
  private place(tooltip: HTMLElement): void {
    const target = this.host.getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    const viewportWidth = this.document.documentElement.clientWidth;

    const above = target.top - size.height - GAP;
    const top = above >= GAP ? above : target.bottom + GAP;
    const centred = target.left + target.width / 2 - size.width / 2;
    const left = Math.min(viewportWidth - size.width - GAP, Math.max(GAP, centred));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  protected hide(): void {
    this.element?.remove();
    this.element = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
