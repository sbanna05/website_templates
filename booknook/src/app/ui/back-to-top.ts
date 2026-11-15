import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { Icon } from './icon';
import { Tooltip } from './tooltip';

const SHOW_AFTER_PX = 320;
const RING_RADIUS = 21;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Floating "back to top" button. The ring around it fills as the page is
 * scrolled, so it doubles as a reading-progress indicator. It appears once
 * the page has scrolled a little and animates the arrow on the way up.
 */
@Component({
  selector: 'app-back-to-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Tooltip],
  styles: `
    button {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 40;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--surface);
      color: var(--ink);
      box-shadow:
        0 0 0 1px var(--line),
        0 6px 16px rgb(0 0 0 / 0.2);
      transition:
        opacity var(--medium),
        transform var(--medium) var(--ease-out),
        visibility var(--medium);
    }

    button[hidden] {
      display: grid;
      visibility: hidden;
      opacity: 0;
      transform: translateY(12px) scale(0.85);
    }

    svg {
      position: absolute;
      inset: 0;
      transform: rotate(-90deg);
    }

    .track {
      stroke: var(--line);
    }

    .progress {
      stroke: var(--accent-text);
      transition: stroke-dashoffset 80ms linear;
    }
  `,
  template: `
    <button
      type="button"
      [hidden]="!visible()"
      [attr.aria-label]="'Back to top. ' + percent() + '% of the page scrolled'"
      appTooltip="Back to top"
      (click)="scrollToTop()"
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle class="track" cx="24" cy="24" [attr.r]="radius" stroke-width="3" />
        <circle
          class="progress"
          cx="24"
          cy="24"
          [attr.r]="radius"
          stroke-width="3"
          stroke-linecap="round"
          [attr.stroke-dasharray]="ringLength"
          [attr.stroke-dashoffset]="dashOffset()"
        />
      </svg>
      <span #arrow class="inline-flex"><app-icon name="arrow-up" /></span>
    </button>
  `,
})
export class BackToTop {
  private readonly document = inject(DOCUMENT);
  private readonly arrow = viewChild.required<ElementRef<HTMLElement>>('arrow');

  protected readonly radius = RING_RADIUS;
  protected readonly ringLength = RING_LENGTH;
  private readonly progress = signal(0);
  protected readonly visible = signal(false);
  protected readonly percent = computed(() => Math.round(this.progress() * 100));
  protected readonly dashOffset = computed(() => RING_LENGTH * (1 - this.progress()));

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const root = this.document.documentElement;
      const update = () => {
        const scrollable = root.scrollHeight - root.clientHeight;
        this.progress.set(scrollable > 0 ? Math.min(1, root.scrollTop / scrollable) : 0);
        this.visible.set(root.scrollTop > SHOW_AFTER_PX);
      };

      update();
      addEventListener('scroll', update, { passive: true });
      addEventListener('resize', update, { passive: true });
      destroyRef.onDestroy(() => {
        removeEventListener('scroll', update);
        removeEventListener('resize', update);
      });
    });
  }

  protected scrollToTop(): void {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    if (reducedMotion) return;

    // The arrow launches upward and drops back in, confirming the press.
    gsap
      .timeline()
      .to(this.arrow().nativeElement, { y: -26, opacity: 0, duration: 0.22, ease: 'power2.in' })
      .set(this.arrow().nativeElement, { y: 26 })
      .to(this.arrow().nativeElement, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
  }
}
